import { CloseOutlined, PlusOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Checkbox, Col, Divider, Flex, InputNumber, Row, Segmented, Tag, Typography, theme } from 'antd';
import { useEffect, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import type { Person, SignSlot, SlotLayout } from '../../../shared/api/types';
import PdfPage, { PAPER } from '../../documents/components/PdfPage';
import { checkSlots, PT_PER_MM, slotMessage, type SlotMap } from '../lib/slots';

const MIN_W = 15 * PT_PER_MM;
const MIN_H = 8 * PT_PER_MM;
const NEW_W = 50 * PT_PER_MM;
const NEW_H = 22 * PT_PER_MM;

interface Props {
  requestId: number;
  /** Tệp cần ký (đã có trên máy chủ). */
  files: { id: number; name: string }[];
  layouts: Record<number, SlotLayout>;
  value: SlotMap;
  onChange: (attachmentId: number, slots: SignSlot[]) => void;
  /** Người ký theo thứ tự (người thứ k ↔ ô số k); `step` = bước ký (hiện khi có bước nhiều người). */
  signers: (Pick<Person, 'id' | 'fullName' | 'jobTitle'> & { step?: number })[];
  /** Ảnh chữ ký thật của từng người: userId → data URL, null = chưa có ảnh; undefined = đang tải. */
  signatures?: Record<number, string | null>;
}

type Sel = { file: number; index: number } | null;

/**
 * Bước "Vị trí ký": hiện các trang PDF (ảnh do máy chủ render), ô ký đọc từ annotation trong PDF; người soạn đặt
 * thêm, kéo, đổi cỡ, đổi số, xoá ô. Kích thước ô = kích thước chữ ký khi đóng vào PDF.
 */
export default function SlotEditor({ requestId, files, layouts, value, onChange, signers, signatures }: Props) {
  const { token } = theme.useToken();
  const palette = [token.blue6, token.cyan7, token.purple6, token.magenta6, token.orange6, token.geekblue6, token.green7];
  const colorOf = (n: number) => (n <= signers.length ? palette[(n - 1) % palette.length] : token.colorError);

  const [fileId, setFileId] = useState(files[0]?.id);
  const [sel, setSel] = useState<Sel>(null);
  const [placing, setPlacing] = useState<number | null>(null);
  const [showSample, setShowSample] = useState(true);

  const n = signers.length;
  const sigOf = (k: number) => (k <= n && signatures ? signatures[signers[k - 1].id] : undefined);
  const showSteps = new Set(signers.map((s) => s.step)).size < n;
  const check = checkSlots(value, n);
  const layout = fileId ? layouts[fileId] : undefined;
  const current = fileId ? (value[fileId] ?? []) : [];
  const selected = sel ? value[sel.file]?.[sel.index] : undefined;

  const update = (file: number, list: SignSlot[]) => onChange(file, list);
  const patch = (file: number, index: number, p: Partial<SignSlot>) =>
    update(
      file,
      (value[file] ?? []).map((s, i) => (i === index ? { ...s, ...p } : s)),
    );
  const remove = (file: number, index: number) => {
    update(
      file,
      (value[file] ?? []).filter((_, i) => i !== index),
    );
    setSel(null);
  };

  // phím Delete xoá ô đang chọn, Esc huỷ chế độ đặt ô
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && sel) remove(sel.file, sel.index);
      if (e.key === 'Escape') setPlacing(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const placeAt = (page: number, x: number, y: number) => {
    if (placing == null || !fileId || !layout) return;
    const size = layout.pages[page - 1];
    const s: SignSlot = {
      orderNo: placing,
      page,
      x: clamp(x - NEW_W / 2, 0, size.width - NEW_W),
      y: clamp(y - NEW_H / 2, 0, size.height - NEW_H),
      width: NEW_W,
      height: NEW_H,
    };
    update(fileId, [...current, s]);
    setSel({ file: fileId, index: current.length });
    setPlacing(null);
  };

  const slotsOf = (k: number) =>
    Object.entries(value).flatMap(([f, l]) =>
      l.map((s, i) => ({ s, file: Number(f), index: i })).filter((x) => x.s.orderNo === k),
    );
  const extraSlots = Object.entries(value).flatMap(([f, l]) =>
    l.map((s, i) => ({ s, file: Number(f), index: i })).filter((x) => x.s.orderNo > n),
  );
  const fileName = (id: number) => files.find((f) => f.id === id)?.name ?? '';

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} xl={16}>
        <Card
          size="small"
          title={fileId ? fileName(fileId) : 'Tệp cần ký'}
          extra={
            files.length > 1 ? (
              <Segmented
                size="small"
                value={fileId}
                onChange={(v) => {
                  setFileId(v as number);
                  setSel(null);
                }}
                options={files.map((f) => ({ value: f.id, label: f.name }))}
              />
            ) : (
              layout && <Typography.Text type="secondary">{layout.pages.length} trang</Typography.Text>
            )
          }
          styles={{ body: { background: token.colorFillSecondary, padding: 12 } }}
        >
          <div style={{ maxHeight: '75vh', overflow: 'auto' }}>
            <Flex vertical align="center" gap={16}>
              {fileId &&
                layout?.pages.map((size, i) => (
                  <PdfPage
                    key={`${fileId}-${i}`}
                    requestId={requestId}
                    attachmentId={fileId}
                    page={i + 1}
                    width={size.width}
                    height={size.height}
                    cursor={placing != null ? 'crosshair' : undefined}
                    onBackgroundPointerDown={(x, y) => (placing != null ? placeAt(i + 1, x, y) : setSel(null))}
                  >
                    {current.map((s, idx) =>
                      s.page === i + 1 ? (
                        <SlotBox
                          key={idx}
                          slot={s}
                          pageW={size.width}
                          pageH={size.height}
                          color={colorOf(s.orderNo)}
                          label={`${s.orderNo} · ${s.orderNo <= n ? signers[s.orderNo - 1].fullName : 'không có người ký'}`}
                          selected={sel?.file === fileId && sel.index === idx}
                          sample={showSample && s.orderNo <= n}
                          signature={sigOf(s.orderNo)}
                          onSelect={() => setSel({ file: fileId, index: idx })}
                          onChange={(p) => patch(fileId, idx, p)}
                          onRemove={() => remove(fileId, idx)}
                        />
                      ) : null,
                    )}
                  </PdfPage>
                ))}
            </Flex>
          </div>
        </Card>
      </Col>

      <Col xs={24} xl={8}>
        <Card title="Ô ký theo thứ tự">
          <Typography.Paragraph type="secondary">
            Ô số <b>k</b> là chỗ người ký thứ <b>k</b> ký. Khi người đó bấm Ký, ảnh chữ ký được đóng vừa khít vào ô.
          </Typography.Paragraph>
          {check.ok ? (
            <Alert type="success" showIcon title={`Đủ ô cho ${n} người ký.`} />
          ) : (
            <Alert type="error" showIcon title={slotMessage(check, n)} description="Chưa trình ký được cho tới khi khớp." />
          )}

          <Flex vertical gap={8} style={{ marginTop: 12 }}>
            {signers.map((p, i) => {
              const k = i + 1;
              const list = slotsOf(k);
              const pages = [...new Set(list.map((x) => `${files.length > 1 ? fileName(x.file) + ' ' : ''}tr.${x.s.page}`))];
              return (
                <Flex
                  key={p.id}
                  align="center"
                  gap={10}
                  data-testid={`signer-slot-${k}`}
                  style={{
                    padding: 10,
                    border: `1px solid ${placing === k ? token.colorPrimary : token.colorBorderSecondary}`,
                    borderRadius: token.borderRadius,
                    cursor: list.length ? 'pointer' : undefined,
                  }}
                  onClick={() => {
                    if (!list[0]) return;
                    setFileId(list[0].file);
                    setSel({ file: list[0].file, index: list[0].index });
                  }}
                >
                  <Badge n={k} color={colorOf(k)} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Typography.Text strong ellipsis>
                      {p.fullName}
                    </Typography.Text>
                    <div>
                      {showSteps && p.step && <Tag>Bước {p.step}</Tag>}
                      {list.length ? (
                        <Tag color="success">
                          {list.length} ô · {pages.join(', ')}
                        </Tag>
                      ) : (
                        <Tag color="warning">Chưa có ô</Tag>
                      )}
                    </div>
                  </div>
                  <SignatureThumb url={sigOf(k)} name={p.fullName} />
                  <Button
                    size="small"
                    type={placing === k ? 'primary' : 'default'}
                    icon={<PlusOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      setPlacing(placing === k ? null : k);
                    }}
                  >
                    {placing === k ? 'Bấm lên trang…' : list.length ? 'Thêm ô' : 'Đặt ô'}
                  </Button>
                </Flex>
              );
            })}
            {extraSlots.map(({ s, file, index }) => (
              <Flex
                key={`x${file}-${index}`}
                align="center"
                gap={10}
                style={{
                  padding: 10,
                  border: `1px solid ${token.colorErrorBorder}`,
                  background: token.colorErrorBg,
                  borderRadius: token.borderRadius,
                }}
              >
                <Badge n={s.orderNo} color={token.colorError} />
                <div style={{ flex: 1 }}>
                  <Typography.Text strong>
                    Ô số {s.orderNo} (trang {s.page})
                  </Typography.Text>
                  <div>
                    <Typography.Text type="secondary">Không có người ký thứ {s.orderNo}</Typography.Text>
                  </div>
                </div>
                <Button size="small" danger onClick={() => remove(file, index)}>
                  Xoá
                </Button>
              </Flex>
            ))}
          </Flex>

          <Divider />
          {selected && sel ? (
            <>
              <Typography.Text strong>
                Ô {selected.orderNo}
                {selected.orderNo <= n ? ` · ${signers[selected.orderNo - 1].fullName}` : ''}
              </Typography.Text>
              <Typography.Text type="secondary"> · trang {selected.page}</Typography.Text>
              <div>
                <Typography.Text type="secondary">Kích thước ô = kích thước chữ ký khi đóng vào PDF.</Typography.Text>
              </div>
              <Flex gap={8} wrap style={{ marginTop: 8 }}>
                <InputNumber
                  aria-label="Rộng (mm)"
                  prefix="Rộng"
                  suffix="mm"
                  min={15}
                  max={200}
                  value={Math.round(selected.width / PT_PER_MM)}
                  onChange={(v) => v && patch(sel.file, sel.index, { width: v * PT_PER_MM })}
                  style={{ width: 170 }}
                />
                <InputNumber
                  aria-label="Cao (mm)"
                  prefix="Cao"
                  suffix="mm"
                  min={8}
                  max={120}
                  value={Math.round(selected.height / PT_PER_MM)}
                  onChange={(v) => v && patch(sel.file, sel.index, { height: v * PT_PER_MM })}
                  style={{ width: 170 }}
                />
                <InputNumber
                  aria-label="Số thứ tự"
                  prefix="Số"
                  min={1}
                  max={99}
                  precision={0}
                  value={selected.orderNo}
                  onChange={(v) => v && patch(sel.file, sel.index, { orderNo: v })}
                  style={{ width: 120 }}
                />
              </Flex>
              <Flex gap={8} wrap style={{ marginTop: 8 }}>
                <Button
                  size="small"
                  onClick={() => {
                    for (const [f, l] of Object.entries(value))
                      update(
                        Number(f),
                        l.map((s) => ({ ...s, width: selected.width, height: selected.height })),
                      );
                  }}
                >
                  Dùng cỡ này cho mọi ô
                </Button>
                <Button size="small" danger onClick={() => remove(sel.file, sel.index)}>
                  Xoá ô
                </Button>
              </Flex>
            </>
          ) : (
            <Typography.Text type="secondary">Chọn một ô trên trang để chỉnh kích thước.</Typography.Text>
          )}
          <Divider />
          <Checkbox checked={showSample} onChange={(e) => setShowSample(e.target.checked)}>
            Hiện chữ ký thật của từng người trong ô
          </Checkbox>
          <div>
            <Typography.Text type="secondary">Ảnh lấy từ hồ sơ từng người; ai chưa có ảnh thì ô kẻ sọc vàng.</Typography.Text>
          </div>
          <div>
            <Typography.Text type="secondary">
              Kéo ô để di chuyển, kéo góc dưới-phải để đổi cỡ, phím Delete để xoá ô đang chọn.
            </Typography.Text>
          </div>
        </Card>
      </Col>
    </Row>
  );
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

function Badge({ n, color }: { n: number; color: string }) {
  const { token } = theme.useToken();
  return (
    <span
      style={{
        width: 26,
        height: 26,
        borderRadius: '50%',
        background: color,
        color: token.colorWhite,
        fontWeight: 700,
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
      }}
    >
      {n}
    </span>
  );
}

interface BoxProps {
  slot: SignSlot;
  pageW: number;
  pageH: number;
  color: string;
  label: string;
  selected: boolean;
  sample: boolean;
  /** Ảnh chữ ký thật của người ký ô này (null = chưa có ảnh, undefined = đang tải). */
  signature?: string | null;
  onSelect: () => void;
  onChange: (p: Partial<SignSlot>) => void;
  onRemove: () => void;
}

/** Ô ký: kéo để di chuyển, kéo góc dưới-phải để đổi cỡ (toạ độ point, gốc trên-trái). */
function SlotBox({ slot, pageW, pageH, color, label, selected, sample, signature, onSelect, onChange, onRemove }: BoxProps) {
  const drag = (resize: boolean) => (e: ReactPointerEvent) => {
    if (e.button > 0) return; // chỉ chuột trái / chạm
    e.stopPropagation();
    e.preventDefault();
    onSelect();
    const pageEl = (e.currentTarget as HTMLElement).closest('[data-testid^="pdf-page-"]') as HTMLElement;
    const k = pageW / pageEl.getBoundingClientRect().width;
    if (!Number.isFinite(k) || k <= 0) return;
    const sx = e.clientX;
    const sy = e.clientY;
    const o = { ...slot };
    const move = (ev: PointerEvent) => {
      const dx = (ev.clientX - sx) * k;
      const dy = (ev.clientY - sy) * k;
      if (!Number.isFinite(dx) || !Number.isFinite(dy)) return;
      if (resize) onChange({ width: clamp(o.width + dx, MIN_W, pageW - o.x), height: clamp(o.height + dy, MIN_H, pageH - o.y) });
      else onChange({ x: clamp(o.x + dx, 0, pageW - o.width), y: clamp(o.y + dy, 0, pageH - o.height) });
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const pct = (v: number, of: number) => `${(v / of) * 100}%`;
  const box: CSSProperties = {
    position: 'absolute',
    left: pct(slot.x, pageW),
    top: pct(slot.y, pageH),
    width: pct(slot.width, pageW),
    height: pct(slot.height, pageH),
    border: `2px ${selected ? 'solid' : 'dashed'} ${sample && signature === null ? PAPER.colorWarning : color}`,
    background:
      sample && signature === null
        ? `repeating-linear-gradient(45deg, ${PAPER.colorWarningBg}, ${PAPER.colorWarningBg} 6px, ${PAPER.colorBgContainer} 6px, ${PAPER.colorBgContainer} 12px)`
        : `${color}14`,
    borderRadius: 4,
    cursor: 'move',
    zIndex: selected ? 2 : 1,
    boxShadow: selected ? `0 0 0 3px ${color}33` : undefined,
    touchAction: 'none',
  };
  return (
    <div role="group" aria-label={`Ô ký ${label}`} style={box} onPointerDown={drag(false)}>
      {sample && signature && (
        <img
          src={signature}
          alt=""
          draggable={false}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }}
        />
      )}
      {sample && signature === null && (
        <span
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            fontSize: 10,
            color: PAPER.colorWarningText,
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          Chưa có ảnh chữ ký
        </span>
      )}
      <span
        style={{
          position: 'absolute',
          top: -2,
          left: -2,
          maxWidth: 'calc(100% + 4px)',
          background: color,
          color: PAPER.colorWhite,
          fontSize: 11,
          fontWeight: 700,
          lineHeight: '18px',
          padding: '0 6px',
          borderRadius: '3px 0 4px 0',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {label}
      </span>
      {selected && (
        <>
          <Button
            size="small"
            shape="circle"
            danger
            type="primary"
            aria-label="Xoá ô"
            icon={<CloseOutlined />}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onRemove}
            style={{ position: 'absolute', top: -12, right: -12, minWidth: 22, width: 22, height: 22 }}
          />
          <span
            aria-label="Đổi cỡ ô"
            onPointerDown={drag(true)}
            style={{
              position: 'absolute',
              right: -6,
              bottom: -6,
              width: 12,
              height: 12,
              background: PAPER.colorBgContainer,
              border: `2px solid ${color}`,
              borderRadius: 2,
              cursor: 'nwse-resize',
            }}
          />
        </>
      )}
    </div>
  );
}

/** Ảnh chữ ký nhỏ cạnh tên người ký (nền giấy trắng); null = chưa có ảnh. */
function SignatureThumb({ url, name }: { url: string | null | undefined; name: string }) {
  if (url === undefined) return null;
  return url ? (
    <span
      style={{
        width: 92,
        height: 34,
        background: PAPER.colorBgContainer,
        borderRadius: 4,
        display: 'grid',
        placeItems: 'center',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      <img src={url} alt={`Chữ ký của ${name}`} style={{ maxWidth: 88, maxHeight: 30, objectFit: 'contain' }} />
    </span>
  ) : (
    <Tag color="warning" style={{ marginInlineEnd: 0 }}>
      Chưa có chữ ký
    </Tag>
  );
}
