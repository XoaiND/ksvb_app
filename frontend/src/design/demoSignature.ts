/**
 * Tách nền ảnh chữ ký trong trình duyệt cho bản preview (backend giả). Cùng thuật toán với
 * `backend/.../user/application/SignatureImageProcessor.java`; bản thật chạy ở máy chủ.
 */
const MAX_IN = 4000;
const MAX_OUT_W = 600;
const PAD = 8;
const LO = 28;
const HI = 80;
const MIN_INK = 40;

export class DemoSignatureError extends Error {
  constructor(
    readonly reason: string,
    message: string,
  ) {
    super(message);
  }
}

/** Chữ ký mẫu (SVG) khi không có canvas (test jsdom, E2E) hoặc cho người dùng mẫu. */
export const SAMPLE_SIGNATURE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="120" viewBox="0 0 320 120"><path d="M20 80 C40 10 70 10 60 70 S110 90 130 50 S160 90 180 60 S220 40 300 45" fill="none" stroke="#1d2b8f" stroke-width="5" stroke-linecap="round"/><path d="M40 100 C120 85 200 95 290 80" fill="none" stroke="#1d2b8f" stroke-width="3" stroke-linecap="round"/></svg>',
  );

/** Chữ ký giả của người dùng mẫu (tên viết tay không dấu, mỗi người một nét/màu mực khác nhau). */
export function demoSignatureOf(name: string, seed: number): string {
  const word = name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[đĐ]/g, (c) => (c === 'đ' ? 'd' : 'D'))
    .split(' ')
    .slice(-1)[0];
  const ink = ['#1d2b8f', '#0b2a8f', '#1a1a6e', '#23408e'][seed % 4];
  const skew = [-10, -4, -12, -6][seed % 4];
  return (
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="120" viewBox="0 0 320 120"><g transform="skewX(${skew})"><text x="175" y="78" text-anchor="middle" font-family="Segoe Script, Brush Script MT, cursive" font-size="54" fill="${ink}">${word}</text><path d="M60 98 C140 84 220 92 300 80" fill="none" stroke="${ink}" stroke-width="3" stroke-linecap="round"/></g></svg>`,
    )
  );
}

const median = (a: number[]) => a.sort((p, q) => p - q)[a.length >> 1];

export async function removeBackground(file: Blob): Promise<string> {
  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(file);
  } catch {
    throw new DemoSignatureError('INVALID_IMAGE', 'Tệp không phải ảnh PNG/JPG hợp lệ');
  }
  const k = Math.min(1, MAX_IN / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * k);
  const h = Math.round(bmp.height * k);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bmp, 0, 0, w, h);
  const im = ctx.getImageData(0, 0, w, h);
  const d = im.data;

  const band = Math.max(2, Math.round(Math.min(w, h) * 0.02));
  const rs: number[] = [];
  const gs: number[] = [];
  const bs: number[] = [];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (x >= band && x < w - band && y >= band && y < h - band) continue;
      const i = (y * w + x) * 4;
      rs.push(d[i]);
      gs.push(d[i + 1]);
      bs.push(d[i + 2]);
    }
  const bg = [median(rs), median(gs), median(bs)];
  const bgL = 0.299 * bg[0] + 0.587 * bg[1] + 0.114 * bg[2];

  let x0 = w;
  let y0 = h;
  let x1 = -1;
  let y1 = -1;
  let ink = 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const [r, g, b] = [d[i], d[i + 1], d[i + 2]];
      const l = 0.299 * r + 0.587 * g + 0.114 * b;
      const dl = l - bgL;
      const chroma = Math.hypot(r - bg[0] - dl, g - bg[1] - dl, b - bg[2] - dl);
      const a = Math.min(1, Math.max(0, (Math.max(0, bgL - l) + 0.5 * chroma - LO) / (HI - LO)));
      if (a > 0) {
        for (let j = 0; j < 3; j++) d[i + j] = Math.max(0, Math.min(255, Math.round((d[i + j] - (1 - a) * bg[j]) / a)));
        if (a > 0.1) {
          ink++;
          x0 = Math.min(x0, x);
          x1 = Math.max(x1, x);
          y0 = Math.min(y0, y);
          y1 = Math.max(y1, y);
        }
      }
      d[i + 3] = Math.round(a * 255);
    }
  if (ink < MIN_INK)
    throw new DemoSignatureError(
      'EMPTY_SIGNATURE',
      'Không tìm thấy nét chữ ký trong ảnh. Hãy chụp lại rõ hơn, bút mực đậm trên giấy trắng.',
    );
  ctx.putImageData(im, 0, 0);

  x0 = Math.max(0, x0 - PAD);
  y0 = Math.max(0, y0 - PAD);
  x1 = Math.min(w - 1, x1 + PAD);
  y1 = Math.min(h - 1, y1 + PAD);
  const cw = x1 - x0 + 1;
  const ch = y1 - y0 + 1;
  const s = Math.min(1, MAX_OUT_W / cw);
  const o = document.createElement('canvas');
  o.width = Math.round(cw * s);
  o.height = Math.max(1, Math.round(ch * s));
  const octx = o.getContext('2d')!;
  octx.imageSmoothingQuality = 'high';
  octx.drawImage(c, x0, y0, cw, ch, 0, 0, o.width, o.height);
  return o.toDataURL('image/png');
}
