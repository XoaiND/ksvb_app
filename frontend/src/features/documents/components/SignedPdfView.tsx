import { Flex, Segmented, Spin, Typography, theme } from 'antd';
import { useState } from 'react';
import type { SignSlot, SlotLayout } from '../../../shared/api/types';
import PdfPage, { boxPos, PAPER } from './PdfPage';

/** Phần ký của người đang xem (chỉ khi đến lượt họ ở màn ký): làm nổi ô của họ và xem trước chữ ký. */
interface MySlotPreview {
  orderNo: number;
  /** Ảnh chữ ký đã tách nền (data URL); không có thì chỉ làm nổi ô. */
  signatureUrl?: string;
  /** Dòng ghi dưới chữ ký (họ tên, thời gian); rỗng = không ghi. */
  caption: string[];
}

interface Props {
  requestId: number;
  /** Tệp cần ký; `signed` = đã có bản đóng chữ ký (cho xem cả bản gốc). */
  files: { id: number; name: string; signed?: boolean }[];
  layouts: (SlotLayout | undefined)[];
  /** Tên người ký thứ k (ô số k). */
  nameOf: (orderNo: number) => string;
  /** Dòng trạng thái góc phải (vd. "Đang xem bản đã ký (2/3 chữ ký)"). */
  status?: string;
  mine?: MySlotPreview;
  /**
   * Xem trước trước khi trình ký: mọi ô hiện mờ chữ ký thật của người ký ô đó.
   * orderNo → data URL (null = người đó chưa có ảnh chữ ký, undefined = đang tải).
   */
  preview?: Record<number, string | null | undefined>;
  /** Chiều cao tối đa vùng cuộn trang. */
  maxHeight?: string;
}

/**
 * Xem tệp cần ký: ảnh trang của bản đang có hiệu lực (chữ ký đã đóng nằm sẵn trong ảnh), cùng các ô ký còn lại:
 * ô của người đang ký được làm nổi kèm chữ ký xem trước, ô của người khác là khung đứt "chờ ký". Tệp đã ký có thể
 * chuyển sang xem bản gốc.
 */
export default function SignedPdfView({ requestId, files, layouts, nameOf, status, mine, preview, maxHeight = '75vh' }: Props) {
  const { token } = theme.useToken();
  const [index, setIndex] = useState(0);
  const [original, setOriginal] = useState(false);
  const file = files[Math.min(index, files.length - 1)];
  const layout = layouts[Math.min(index, files.length - 1)];
  const showOriginal = original && !!file?.signed;

  return (
    <div>
      <Flex justify="space-between" align="center" gap={8} wrap style={{ marginBottom: 8 }}>
        {files.length > 1 ? (
          <Segmented
            size="small"
            value={index}
            onChange={(v) => setIndex(v as number)}
            options={files.map((f, i) => ({ value: i, label: f.name }))}
          />
        ) : (
          <Typography.Text strong>{file?.name}</Typography.Text>
        )}
        <Flex gap={8} align="center" wrap>
          {status && <Typography.Text type="secondary">{status}</Typography.Text>}
          {file?.signed && (
            <Segmented
              size="small"
              aria-label="Bản đang xem"
              value={showOriginal ? 'orig' : 'signed'}
              onChange={(v) => setOriginal(v === 'orig')}
              options={[
                { value: 'signed', label: 'Bản đã ký' },
                { value: 'orig', label: 'Bản gốc' },
              ]}
            />
          )}
        </Flex>
      </Flex>
      <div style={{ background: token.colorFillSecondary, borderRadius: token.borderRadius, padding: 12 }}>
        <div style={{ maxHeight, overflow: 'auto' }}>
          <Flex vertical align="center" gap={16}>
            {!layout || !file ? (
              <Spin />
            ) : (
              layout.pages.map((size, i) => (
                <PdfPage
                  key={`${file.id}-${i}-${showOriginal}`}
                  requestId={requestId}
                  attachmentId={file.id}
                  page={i + 1}
                  width={size.width}
                  height={size.height}
                  original={showOriginal}
                >
                  {!showOriginal &&
                    layout.slots
                      .filter((s) => s.page === i + 1)
                      .map((s, k) =>
                        preview ? (
                          <PreviewSlot
                            key={k}
                            slot={s}
                            pageW={size.width}
                            pageH={size.height}
                            name={nameOf(s.orderNo)}
                            url={preview[s.orderNo]}
                          />
                        ) : mine && s.orderNo === mine.orderNo ? (
                          <MySlot key={k} slot={s} pageW={size.width} pageH={size.height} mine={mine} />
                        ) : (
                          <WaitingSlot key={k} slot={s} pageW={size.width} pageH={size.height} name={nameOf(s.orderNo)} />
                        ),
                      )}
                </PdfPage>
              ))
            )}
          </Flex>
        </div>
      </div>
    </div>
  );
}

function WaitingSlot({ slot, pageW, pageH, name }: { slot: SignSlot; pageW: number; pageH: number; name: string }) {
  const small = slot.height < 36;
  return (
    <div
      aria-label={`Ô ký ${slot.orderNo} chờ ký`}
      style={{
        position: 'absolute',
        ...boxPos(slot, pageW, pageH),
        border: `1.5px dashed ${PAPER.colorBorder}`,
        borderRadius: 4,
        color: PAPER.colorTextTertiary,
        fontSize: 10,
        lineHeight: 1.3,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        overflow: 'hidden',
      }}
    >
      {small ? slot.orderNo : `${slot.orderNo} · ${name} · chờ ký`}
    </div>
  );
}

/** Ô xem trước khi trình ký: chữ ký thật (mờ) của người ký ô đó, hoặc sọc vàng nếu họ chưa có ảnh chữ ký. */
function PreviewSlot({
  slot,
  pageW,
  pageH,
  name,
  url,
}: {
  slot: SignSlot;
  pageW: number;
  pageH: number;
  name: string;
  url: string | null | undefined;
}) {
  const none = url === null;
  return (
    <div
      aria-label={`Ô ký ${slot.orderNo} · ${name}${none ? ' · chưa có ảnh chữ ký' : ''}`}
      style={{
        position: 'absolute',
        ...boxPos(slot, pageW, pageH),
        border: `1.5px dashed ${none ? PAPER.colorWarning : PAPER.colorPrimary}`,
        borderRadius: 3,
        background: none
          ? `repeating-linear-gradient(45deg, ${PAPER.colorWarningBg}, ${PAPER.colorWarningBg} 6px, ${PAPER.colorBgContainer} 6px, ${PAPER.colorBgContainer} 12px)`
          : PAPER.colorPrimaryBg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: -16,
          left: 0,
          fontSize: 10,
          lineHeight: '15px',
          background: none ? PAPER.colorWarning : PAPER.colorPrimary,
          color: PAPER.colorWhite,
          borderRadius: 3,
          padding: '0 6px',
          whiteSpace: 'nowrap',
        }}
      >
        {slot.orderNo} · {name}
      </span>
      {url ? (
        <img src={url} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', opacity: 0.6 }} />
      ) : none ? (
        <span style={{ fontSize: 10, color: PAPER.colorWarningText, textAlign: 'center' }}>Chưa có ảnh chữ ký</span>
      ) : null}
    </div>
  );
}

function MySlot({ slot, pageW, pageH, mine }: { slot: SignSlot; pageW: number; pageH: number; mine: MySlotPreview }) {
  const withCaption = mine.caption.length > 0 && slot.height >= 36;
  return (
    <div
      role="note"
      aria-label="Chữ ký của bạn sẽ ở đây"
      style={{
        position: 'absolute',
        ...boxPos(slot, pageW, pageH),
        border: `2px solid ${PAPER.colorPrimary}`,
        borderRadius: 4,
        background: PAPER.colorPrimaryBg,
        boxShadow: `0 0 0 4px ${PAPER.colorPrimaryBorder}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: -18,
          left: 0,
          fontSize: 10,
          lineHeight: '16px',
          background: PAPER.colorPrimary,
          color: PAPER.colorWhite,
          borderRadius: 3,
          padding: '0 6px',
          whiteSpace: 'nowrap',
        }}
      >
        Chữ ký của bạn sẽ ở đây
      </span>
      {mine.signatureUrl && (
        <img
          src={mine.signatureUrl}
          alt=""
          style={{ flex: 1, minHeight: 0, maxWidth: '100%', objectFit: 'contain', opacity: 0.5 }}
        />
      )}
      {withCaption && (
        <div style={{ fontSize: 8, lineHeight: 1.2, color: PAPER.colorText, textAlign: 'center', whiteSpace: 'nowrap' }}>
          {mine.caption.map((l) => (
            <div key={l}>{l}</div>
          ))}
        </div>
      )}
    </div>
  );
}
