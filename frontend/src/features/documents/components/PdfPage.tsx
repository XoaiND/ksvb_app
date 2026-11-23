import { Flex, Spin, Typography, theme } from 'antd';
import { useRef, type ReactNode } from 'react';
import { useApiQuery } from '../../../shared/api/query';
import { documentsApi } from '../api';

/** Trang PDF luôn là giấy trắng, không theo theme tối. */
export const PAPER = theme.getDesignToken({ algorithm: theme.defaultAlgorithm });

interface Props {
  requestId: number;
  attachmentId: number;
  /** Trang, từ 1. */
  page: number;
  /** Kích thước trang hiển thị (point). */
  width: number;
  height: number;
  /** Ảnh bản gốc thay vì bản đang có hiệu lực (bản đã ký). */
  original?: boolean;
  /** Con trỏ chuột trên trang (vd. 'crosshair' khi đang đặt ô ký). */
  cursor?: string;
  /** Bấm vào vùng trống của trang: toạ độ point, gốc trên-trái. */
  onBackgroundPointerDown?: (x: number, y: number) => void;
  /** Các ô vẽ chồng lên trang, định vị theo % kích thước trang. */
  children?: ReactNode;
}

/** Một trang của tệp cần ký: ảnh JPEG do máy chủ render (bản đang có hiệu lực, không vẽ ô ký), ô vẽ chồng lên. */
export default function PdfPage({
  requestId,
  attachmentId,
  page,
  width,
  height,
  original = false,
  cursor,
  onBackgroundPointerDown,
  children,
}: Props) {
  const img = useApiQuery(
    ['sign-requests', requestId, 'attachments', attachmentId, 'page', page, original],
    () => documentsApi.page(requestId, attachmentId, page, original),
    { silent: true, keepPrevious: false },
  );
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={ref}
      data-testid={`pdf-page-${page}`}
      onPointerDown={(e) => {
        if (!onBackgroundPointerDown) return;
        if (e.target !== e.currentTarget && !(e.target as HTMLElement).dataset.pageBg) return;
        const r = ref.current!.getBoundingClientRect();
        const k = width / r.width;
        onBackgroundPointerDown((e.clientX - r.left) * k, (e.clientY - r.top) * k);
      }}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: 640,
        aspectRatio: `${width} / ${height}`,
        background: PAPER.colorBgContainer,
        boxShadow: PAPER.boxShadowTertiary,
        cursor,
        userSelect: 'none',
        touchAction: 'none',
      }}
    >
      {img.data ? (
        <img
          src={img.data.imageDataUrl}
          alt={`Trang ${page}`}
          data-page-bg="1"
          draggable={false}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        />
      ) : (
        <Flex data-page-bg="1" align="center" justify="center" style={{ position: 'absolute', inset: 0 }}>
          {img.isError ? <Typography.Text type="danger">Không tải được trang {page}</Typography.Text> : <Spin />}
        </Flex>
      )}
      {children}
      <span style={{ position: 'absolute', right: 8, bottom: 4, fontSize: 11, color: PAPER.colorTextTertiary }}>
        Trang {page}
      </span>
    </div>
  );
}

/** Vị trí ô (point, gốc trên-trái) → CSS % trên trang. */
export const boxPos = (s: { x: number; y: number; width: number; height: number }, pageW: number, pageH: number) => ({
  left: `${(s.x / pageW) * 100}%`,
  top: `${(s.y / pageH) * 100}%`,
  width: `${(s.width / pageW) * 100}%`,
  height: `${(s.height / pageH) * 100}%`,
});
