package ksvb.user.application;

import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Arrays;
import java.util.Iterator;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import ksvb.shared.error.BusinessException;
import org.springframework.stereotype.Component;

/**
 * Tách nền ảnh chữ ký (ảnh chụp/scan chữ ký trên giấy) thành PNG trong suốt, cắt sát nét chữ ký.
 *
 * <ol>
 *   <li>Màu nền = trung vị các điểm ảnh ở dải 2% quanh mép ảnh (chịu được giấy hơi xám/vàng, ảnh chụp lệch sáng).</li>
 *   <li>Mỗi điểm: khoảng cách tới nền = độ tối hơn nền + nửa độ lệch sắc độ (giữ mực xanh/đỏ); khoảng cách nằm giữa
 *       {@link #LO} và {@link #HI} cho alpha dốc mềm để viền nét mịn; bỏ ám màu nền khỏi điểm bán trong suốt.</li>
 *   <li>Cắt sát vùng có mực + đệm {@link #PAD}px, thu về rộng tối đa {@link #MAX_OUT_WIDTH}px.</li>
 * </ol>
 * Chỉ nhận PNG/JPG (kiểm theo byte đầu tệp, không theo đuôi).
 */
@Component
public class SignatureImageProcessor {

    static final int MAX_BYTES = 5 * 1024 * 1024;
    static final int MAX_OUT_WIDTH = 600;
    private static final int MAX_WORK_SIDE = 4000;
    private static final long MAX_SOURCE_PIXELS = 50_000_000L;
    private static final int PAD = 8;
    private static final double LO = 28;
    private static final double HI = 80;
    /** Ít hơn số điểm mực này coi như ảnh trống (bụi, nhiễu). */
    private static final int MIN_INK_PIXELS = 40;

    public byte[] process(byte[] input) {
        if (input == null || input.length == 0) {
            throw new BusinessException("EMPTY_FILE", "Tệp rỗng");
        }
        if (input.length > MAX_BYTES) {
            throw new BusinessException("FILE_TOO_LARGE", "Ảnh chữ ký tối đa 5 MB");
        }
        if (!isPng(input) && !isJpeg(input)) {
            throw invalid();
        }
        BufferedImage src = toRgb(fitWithin(read(input), MAX_WORK_SIDE));
        BufferedImage out = removeBackground(src);
        return writePng(out);
    }

    // ---------- thuật toán ----------

    static BufferedImage removeBackground(BufferedImage img) {
        int w = img.getWidth();
        int h = img.getHeight();
        int[] px = img.getRGB(0, 0, w, h, null, 0, w);
        int[] bg = borderMedian(px, w, h);
        double bgL = luma(bg[0], bg[1], bg[2]);

        int x0 = w, y0 = h, x1 = -1, y1 = -1, ink = 0;
        int[] res = new int[px.length];
        for (int y = 0; y < h; y++) {
            for (int x = 0; x < w; x++) {
                int i = y * w + x;
                int r = (px[i] >> 16) & 0xff, g = (px[i] >> 8) & 0xff, b = px[i] & 0xff;
                double l = luma(r, g, b);
                double dark = Math.max(0, bgL - l);
                double dl = l - bgL;
                double chroma = Math.sqrt(sq(r - bg[0] - dl) + sq(g - bg[1] - dl) + sq(b - bg[2] - dl));
                double a = clamp((dark + 0.5 * chroma - LO) / (HI - LO));
                if (a <= 0) {
                    continue; // trong suốt hoàn toàn (res[i] = 0)
                }
                int rr = unmix(r, bg[0], a), gg = unmix(g, bg[1], a), bb = unmix(b, bg[2], a);
                res[i] = ((int) Math.round(a * 255) << 24) | (rr << 16) | (gg << 8) | bb;
                if (a > 0.1) {
                    ink++;
                    if (x < x0) x0 = x;
                    if (x > x1) x1 = x;
                    if (y < y0) y0 = y;
                    if (y > y1) y1 = y;
                }
            }
        }
        if (ink < MIN_INK_PIXELS) {
            throw new BusinessException("EMPTY_SIGNATURE",
                    "Không tìm thấy nét chữ ký trong ảnh. Hãy chụp lại rõ hơn, bút mực đậm trên giấy trắng.");
        }
        x0 = Math.max(0, x0 - PAD);
        y0 = Math.max(0, y0 - PAD);
        x1 = Math.min(w - 1, x1 + PAD);
        y1 = Math.min(h - 1, y1 + PAD);
        int cw = x1 - x0 + 1, ch = y1 - y0 + 1;
        BufferedImage cropped = new BufferedImage(cw, ch, BufferedImage.TYPE_INT_ARGB);
        cropped.setRGB(0, 0, cw, ch, res, y0 * w + x0, w);
        return cw > MAX_OUT_WIDTH ? scale(cropped, MAX_OUT_WIDTH, Math.max(1, Math.round(ch * (float) MAX_OUT_WIDTH / cw)))
                : cropped;
    }

    private static int[] borderMedian(int[] px, int w, int h) {
        int band = Math.max(2, Math.round(Math.min(w, h) * 0.02f));
        int[] rs = new int[px.length], gs = new int[px.length], bs = new int[px.length];
        int n = 0;
        for (int y = 0; y < h; y++) {
            for (int x = 0; x < w; x++) {
                if (x >= band && x < w - band && y >= band && y < h - band) {
                    continue;
                }
                int p = px[y * w + x];
                rs[n] = (p >> 16) & 0xff;
                gs[n] = (p >> 8) & 0xff;
                bs[n] = p & 0xff;
                n++;
            }
        }
        return new int[] {median(rs, n), median(gs, n), median(bs, n)};
    }

    private static int median(int[] a, int n) {
        int[] c = Arrays.copyOf(a, n);
        Arrays.sort(c);
        return c[n / 2];
    }

    private static double luma(double r, double g, double b) {
        return 0.299 * r + 0.587 * g + 0.114 * b;
    }

    private static double sq(double v) {
        return v * v;
    }

    private static double clamp(double v) {
        return v < 0 ? 0 : v > 1 ? 1 : v;
    }

    /** Màu mực khi bỏ phần nền đã pha vào: c = a·ink + (1−a)·bg. */
    private static int unmix(int c, int bg, double a) {
        long v = Math.round((c - (1 - a) * bg) / a);
        return (int) Math.max(0, Math.min(255, v));
    }

    // ---------- đọc / ghi ảnh ----------

    private static BufferedImage read(byte[] input) {
        try (ImageInputStream in = ImageIO.createImageInputStream(new ByteArrayInputStream(input))) {
            Iterator<ImageReader> readers = in == null ? null : ImageIO.getImageReaders(in);
            if (readers == null || !readers.hasNext()) {
                throw invalid();
            }
            ImageReader reader = readers.next();
            try {
                reader.setInput(in, true, true);
                // chặn ảnh "bom giải nén": kiểm kích thước trước khi giải mã
                if ((long) reader.getWidth(0) * reader.getHeight(0) > MAX_SOURCE_PIXELS) {
                    throw new BusinessException("INVALID_IMAGE", "Ảnh có độ phân giải quá lớn");
                }
                return reader.read(0);
            } finally {
                reader.dispose();
            }
        } catch (IOException | RuntimeException e) {
            if (e instanceof BusinessException be) throw be;
            throw invalid();
        }
    }

    private static BufferedImage fitWithin(BufferedImage img, int maxSide) {
        int w = img.getWidth(), h = img.getHeight();
        if (Math.max(w, h) <= maxSide) {
            return img;
        }
        double k = (double) maxSide / Math.max(w, h);
        return scale(img, Math.max(1, (int) Math.round(w * k)), Math.max(1, (int) Math.round(h * k)));
    }

    /** Đưa về RGB không alpha (PNG có sẵn nền trong suốt được coi như nền trắng). */
    private static BufferedImage toRgb(BufferedImage img) {
        BufferedImage rgb = new BufferedImage(img.getWidth(), img.getHeight(), BufferedImage.TYPE_INT_RGB);
        Graphics2D g = rgb.createGraphics();
        try {
            g.setColor(java.awt.Color.WHITE);
            g.fillRect(0, 0, img.getWidth(), img.getHeight());
            g.drawImage(img, 0, 0, null);
        } finally {
            g.dispose();
        }
        return rgb;
    }

    private static BufferedImage scale(BufferedImage img, int w, int h) {
        int type = img.getColorModel().hasAlpha() ? BufferedImage.TYPE_INT_ARGB : BufferedImage.TYPE_INT_RGB;
        BufferedImage out = new BufferedImage(w, h, type);
        Graphics2D g = out.createGraphics();
        try {
            g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
            g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            g.drawImage(img, 0, 0, w, h, null);
        } finally {
            g.dispose();
        }
        return out;
    }

    private static byte[] writePng(BufferedImage img) {
        try {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            ImageIO.write(img, "png", out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new IllegalStateException("Không ghi được ảnh PNG", e);
        }
    }

    private static boolean isPng(byte[] b) {
        return b.length > 8 && (b[0] & 0xff) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G';
    }

    private static boolean isJpeg(byte[] b) {
        return b.length > 3 && (b[0] & 0xff) == 0xFF && (b[1] & 0xff) == 0xD8 && (b[2] & 0xff) == 0xFF;
    }

    private static BusinessException invalid() {
        return new BusinessException("INVALID_IMAGE", "Tệp không phải ảnh PNG/JPG hợp lệ");
    }
}
