package ksvb.signrequest.infra;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Path;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.MemoryCacheImageOutputStream;
import ksvb.shared.error.BusinessException;
import ksvb.signrequest.domain.SignSlot;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.PDPageContentStream.AppendMode;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.encryption.InvalidPasswordException;
import org.apache.pdfbox.pdmodel.font.PDType0Font;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.pdfbox.pdmodel.graphics.color.PDColor;
import org.apache.pdfbox.pdmodel.graphics.color.PDDeviceRGB;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.apache.pdfbox.pdmodel.interactive.annotation.PDAnnotation;
import org.apache.pdfbox.pdmodel.interactive.annotation.PDAnnotationFreeText;
import org.apache.pdfbox.pdmodel.interactive.annotation.PDBorderStyleDictionary;
import org.apache.pdfbox.rendering.ImageType;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.pdfbox.util.Matrix;
import org.springframework.stereotype.Component;

/**
 * Ô ký là annotation trong tệp PDF (không lưu DB). Nhận diện:
 * <ul>
 *   <li>annotation do KSVB ghi: {@code /NM} bắt đầu bằng {@value #NM_PREFIX};</li>
 *   <li>annotation đặt sẵn bằng phần mềm khác (Foxit, Acrobat...): kiểu FreeText hoặc Square có nội dung chỉ là một số
 *       1..99 (cho phép dạng {@code #2}).</li>
 * </ul>
 * Toạ độ trao đổi với bên ngoài theo trang hiển thị: đã xoay theo {@code /Rotate}, tính từ góc trên-trái CropBox.
 */
@Component
public class PdfSignatureSlots {

    static final String NM_PREFIX = "ksvb-slot-";
    private static final Pattern NUMBER = Pattern.compile("^\\s*#?\\s*(\\d{1,2})\\s*$");
    private static final float RENDER_DPI = 110;

    /** Kích thước một trang hiển thị (point). */
    public record PageSize(double width, double height) {}

    /** Bố cục: kích thước các trang + ô ký đọc được. */
    public record Layout(List<PageSize> pages, List<SignSlot> slots) {}

    /** Mở thử tệp: báo lỗi nghiệp vụ nếu không phải PDF đọc được hoặc có mật khẩu. */
    public void validate(byte[] pdf) {
        try (PDDocument doc = load(pdf)) {
            if (doc.getNumberOfPages() == 0) {
                throw new BusinessException("INVALID_PDF", "Tệp PDF không có trang nào");
            }
        } catch (InvalidPasswordException e) {
            throw encrypted();
        } catch (IOException e) {
            throw invalid();
        }
    }

    public Layout read(Path file) {
        try (PDDocument doc = load(file)) {
            List<PageSize> pages = new ArrayList<>();
            List<SignSlot> slots = new ArrayList<>();
            int n = 0;
            for (PDPage page : doc.getPages()) {
                n++;
                Frame f = new Frame(page);
                pages.add(new PageSize(Frame.round(f.viewWidth()), Frame.round(f.viewHeight())));
                for (PDAnnotation a : page.getAnnotations()) {
                    Integer order = orderOf(a);
                    if (order != null) {
                        slots.add(f.toView(order, n, a.getRectangle()));
                    }
                }
            }
            return new Layout(pages, slots);
        } catch (IOException e) {
            throw invalid();
        }
    }

    /**
     * Ghi lại toàn bộ ô ký: xoá mọi annotation ô ký cũ, thêm FreeText cho từng ô trong {@code slots}; trả về nội dung
     * PDF mới (nơi gọi tự ghi ra tệp mới).
     */
    public byte[] write(Path file, List<SignSlot> slots) {
        try (PDDocument doc = load(file)) {
            int count = doc.getNumberOfPages();
            for (SignSlot s : slots) {
                if (s.page() < 1 || s.page() > count) {
                    throw new BusinessException("INVALID_SLOT", "Ô ký số " + s.orderNo() + " nằm ở trang không tồn tại");
                }
            }
            int n = 0;
            for (PDPage page : doc.getPages()) {
                n++;
                List<PDAnnotation> kept = new ArrayList<>();
                for (PDAnnotation a : page.getAnnotations()) {
                    if (orderOf(a) == null) kept.add(a);
                }
                Frame f = new Frame(page);
                int i = 0;
                for (SignSlot s : slots) {
                    if (s.page() == n) kept.add(freeText(doc, s, f.toUser(s), i++));
                }
                page.setAnnotations(kept);
            }
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            doc.save(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw invalid();
        }
    }

    /** Ảnh JPEG một trang (không vẽ annotation ô ký, giao diện tự vẽ ô). */
    public byte[] renderPage(Path file, int page) {
        try (PDDocument doc = load(file)) {
            if (page < 1 || page > doc.getNumberOfPages()) {
                throw new BusinessException("INVALID_PAGE", "Trang " + page + " không tồn tại");
            }
            PDFRenderer renderer = new PDFRenderer(doc);
            renderer.setAnnotationsFilter(a -> orderOf(a) == null);
            BufferedImage img = renderer.renderImageWithDPI(page - 1, RENDER_DPI, ImageType.RGB);
            return jpeg(img);
        } catch (IOException e) {
            throw invalid();
        }
    }

    /**
     * Đóng ảnh chữ ký (PNG trong suốt) vào mọi ô số {@code orderNo}: ảnh co vừa ô (giữ tỉ lệ, căn giữa), nếu có
     * {@code caption} và ô đủ cao thì ghi các dòng chữ (họ tên, thời gian) dưới ảnh; xoá annotation của các ô đó.
     * Trả về PDF mới, hoặc null nếu tệp không có ô nào của người này.
     */
    public byte[] stamp(Path file, int orderNo, byte[] png, List<String> caption) {
        try (PDDocument doc = load(file)) {
            PDImageXObject image = PDImageXObject.createFromByteArray(doc, png, "chu-ky");
            PDType0Font font = null;
            int stamped = 0;
            for (PDPage page : doc.getPages()) {
                Frame f = new Frame(page);
                List<PDAnnotation> kept = new ArrayList<>();
                List<PDRectangle> mine = new ArrayList<>();
                for (PDAnnotation a : page.getAnnotations()) {
                    Integer o = orderOf(a);
                    if (o != null && o == orderNo) mine.add(a.getRectangle());
                    else kept.add(a);
                }
                if (mine.isEmpty()) continue;
                try (PDPageContentStream cs = new PDPageContentStream(doc, page, AppendMode.APPEND, true, true)) {
                    cs.transform(f.viewToUser()); // vẽ theo toạ độ trang hiển thị (gốc dưới-trái), ảnh luôn đứng thẳng
                    for (PDRectangle r : mine) {
                        SignSlot s = f.toView(orderNo, 0, r);
                        float x = (float) s.x(), w = (float) s.width(), h = (float) s.height();
                        float bottom = (float) (f.viewHeight() - s.y() - s.height());
                        float fontSize = Math.max(5f, Math.min(9f, h * 0.13f));
                        boolean withCaption = !caption.isEmpty() && h >= 36;
                        float capH = withCaption ? caption.size() * fontSize * 1.2f + 2 : 0;
                        drawFitted(cs, image, x, bottom + capH, w, h - capH);
                        if (withCaption) {
                            if (font == null) font = captionFont(doc);
                            float y = bottom + capH - fontSize;
                            cs.setNonStrokingColor(0.13f, 0.13f, 0.13f);
                            for (String line : caption) {
                                float tw = font.getStringWidth(line) / 1000 * fontSize;
                                float size = tw > w ? fontSize * w / tw : fontSize; // dòng dài thì thu nhỏ cho vừa ô
                                tw = font.getStringWidth(line) / 1000 * size;
                                cs.beginText();
                                cs.setFont(font, size);
                                cs.newLineAtOffset(x + (w - tw) / 2, y);
                                cs.showText(line);
                                cs.endText();
                                y -= fontSize * 1.2f;
                            }
                        }
                        stamped++;
                    }
                }
                page.setAnnotations(kept);
            }
            if (stamped == 0) return null;
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            doc.save(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw invalid();
        }
    }

    private static void drawFitted(PDPageContentStream cs, PDImageXObject img, float x, float y, float w, float h)
            throws IOException {
        if (w <= 0 || h <= 0) return;
        float k = Math.min(w / img.getWidth(), h / img.getHeight());
        float iw = img.getWidth() * k, ih = img.getHeight() * k;
        cs.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
    }

    /** Font có dấu tiếng Việt: LiberationSans đi kèm PDFBox (nhúng tập con vào PDF). */
    private static PDType0Font captionFont(PDDocument doc) throws IOException {
        try (InputStream in = PDDocument.class.getResourceAsStream("/org/apache/pdfbox/resources/ttf/LiberationSans-Regular.ttf")) {
            if (in == null) throw new IOException("Thiếu font LiberationSans trong PDFBox");
            return PDType0Font.load(doc, in);
        }
    }

    /** PDF mẫu một trang A4 có sẵn ô ký 1..signers (dữ liệu demo). Chữ không dấu vì font chuẩn không có tiếng Việt. */
    public byte[] samplePdf(String title, int signers) {
        try (PDDocument doc = new PDDocument()) {
            PDPage page = new PDPage(PDRectangle.A4);
            doc.addPage(page);
            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                cs.beginText();
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 16);
                cs.newLineAtOffset(72, 760);
                cs.showText(ascii(title));
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 11);
                for (int i = 0; i < 12; i++) {
                    cs.newLineAtOffset(0, i == 0 ? -40 : -18);
                    cs.showText("Noi dung van ban mau dong " + (i + 1) + ". Lorem ipsum dolor sit amet.");
                }
                cs.endText();
            }
            List<SignSlot> slots = new ArrayList<>();
            for (int k = 1; k <= signers; k++) {
                int col = (k - 1) % 2, row = (k - 1) / 2;
                slots.add(new SignSlot(k, 1, 72 + col * 260, 470 + row * 110, 170, 70));
            }
            Frame f = new Frame(page);
            List<PDAnnotation> annots = new ArrayList<>();
            int i = 0;
            for (SignSlot s : slots) annots.add(freeText(doc, s, f.toUser(s), i++));
            page.setAnnotations(annots);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            doc.save(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new IllegalStateException("Không tạo được PDF mẫu", e);
        }
    }

    private static String ascii(String s) {
        String n = Normalizer.normalize(s.replace('đ', 'd').replace('Đ', 'D'), Normalizer.Form.NFD);
        return n.replaceAll("\\p{M}", "").replaceAll("[^\\x20-\\x7E]", "?");
    }

    // ------------------------------------------------------------------ chi tiết

    static Integer orderOf(PDAnnotation a) {
        String nm = a.getAnnotationName();
        if (nm != null && nm.startsWith(NM_PREFIX)) {
            Integer n = parse(a.getContents());
            return n != null ? n : 0; // ô KSVB hỏng nội dung: vẫn coi là ô để ghi đè/xoá
        }
        String sub = a.getSubtype();
        if (PDAnnotationFreeText.SUB_TYPE.equals(sub) || "Square".equals(sub)) {
            return parse(a.getContents());
        }
        return null;
    }

    private static Integer parse(String contents) {
        if (contents == null) return null;
        Matcher m = NUMBER.matcher(contents);
        if (!m.matches()) return null;
        int n = Integer.parseInt(m.group(1));
        return n >= 1 ? n : null;
    }

    private static PDAnnotationFreeText freeText(PDDocument doc, SignSlot s, PDRectangle rect, int i) {
        PDAnnotationFreeText a = new PDAnnotationFreeText();
        a.setRectangle(rect);
        a.setContents(String.valueOf(s.orderNo()));
        a.setAnnotationName(NM_PREFIX + s.orderNo() + "-" + s.page() + "-" + i);
        a.setDefaultAppearance("/Helv 10 Tf 0.09 0.41 0.86 rg");
        a.setColor(new PDColor(new float[] {0.09f, 0.41f, 0.86f}, PDDeviceRGB.INSTANCE));
        PDBorderStyleDictionary border = new PDBorderStyleDictionary();
        border.setWidth(1);
        border.setStyle(PDBorderStyleDictionary.STYLE_DASHED);
        a.setBorderStyle(border);
        a.setPrinted(false);
        try {
            a.constructAppearances(doc);
        } catch (RuntimeException ignored) {
            // trình xem PDF tự dựng hình nếu thiếu appearance; ô vẫn đọc được qua /Contents
        }
        return a;
    }

    private static byte[] jpeg(BufferedImage img) throws IOException {
        ImageWriter w = ImageIO.getImageWritersByFormatName("jpeg").next();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (MemoryCacheImageOutputStream ios = new MemoryCacheImageOutputStream(out)) {
            w.setOutput(ios);
            ImageWriteParam p = w.getDefaultWriteParam();
            p.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
            p.setCompressionQuality(0.8f);
            w.write(null, new IIOImage(img, null, null), p);
        } finally {
            w.dispose();
        }
        return out.toByteArray();
    }

    private static PDDocument load(Path file) throws IOException {
        PDDocument doc = Loader.loadPDF(file.toFile());
        rejectEncrypted(doc);
        return doc;
    }

    private static PDDocument load(byte[] pdf) throws IOException {
        PDDocument doc = Loader.loadPDF(pdf);
        rejectEncrypted(doc);
        return doc;
    }

    private static void rejectEncrypted(PDDocument doc) throws IOException {
        if (doc.isEncrypted()) {
            doc.close();
            throw encrypted();
        }
    }

    private static BusinessException encrypted() {
        return new BusinessException("ENCRYPTED_PDF", "Tệp PDF có mật khẩu hoặc bị khoá chỉnh sửa, không đặt ô ký được");
    }

    private static BusinessException invalid() {
        return new BusinessException("INVALID_PDF", "Nội dung tệp không phải PDF hợp lệ");
    }

    /**
     * Đổi toạ độ giữa không gian PDF (gốc dưới-trái MediaBox, chưa xoay) và trang hiển thị (gốc trên-trái CropBox, đã
     * xoay theo /Rotate theo chiều kim đồng hồ).
     */
    record Frame(double cx, double cy, double cw, double ch, int rot) {
        Frame(PDPage p) {
            this(p.getCropBox().getLowerLeftX(), p.getCropBox().getLowerLeftY(), p.getCropBox().getWidth(),
                    p.getCropBox().getHeight(), Math.floorMod(p.getRotation(), 360));
        }

        /**
         * Ma trận đổi toạ độ trang hiển thị (gốc DƯỚI-trái, y lên) sang không gian PDF, để vẽ nội dung đứng thẳng trên
         * trang có /Rotate.
         */
        Matrix viewToUser() {
            float w = (float) cw, h = (float) ch, x = (float) cx, y = (float) cy;
            return switch (rot) {
                case 90 -> new Matrix(0, 1, -1, 0, w + x, y);
                case 180 -> new Matrix(-1, 0, 0, -1, w + x, h + y);
                case 270 -> new Matrix(0, -1, 1, 0, x, h + y);
                default -> new Matrix(1, 0, 0, 1, x, y);
            };
        }

        double viewWidth() { return rot == 90 || rot == 270 ? ch : cw; }
        double viewHeight() { return rot == 90 || rot == 270 ? cw : ch; }

        /** Điểm PDF (tương đối CropBox) → điểm hiển thị. */
        private double[] view(double ux, double uy) {
            return switch (rot) {
                case 90 -> new double[] {uy, ux};
                case 180 -> new double[] {cw - ux, uy};
                case 270 -> new double[] {ch - uy, cw - ux};
                default -> new double[] {ux, ch - uy};
            };
        }

        /** Điểm hiển thị → điểm PDF (tương đối CropBox). */
        private double[] user(double dx, double dy) {
            return switch (rot) {
                case 90 -> new double[] {dy, dx};
                case 180 -> new double[] {cw - dx, dy};
                case 270 -> new double[] {cw - dy, ch - dx};
                default -> new double[] {dx, ch - dy};
            };
        }

        SignSlot toView(int order, int page, PDRectangle r) {
            double[] a = view(r.getLowerLeftX() - cx, r.getLowerLeftY() - cy);
            double[] b = view(r.getUpperRightX() - cx, r.getUpperRightY() - cy);
            double x = Math.min(a[0], b[0]), y = Math.min(a[1], b[1]);
            return new SignSlot(order, page, round(x), round(y), round(Math.abs(a[0] - b[0])), round(Math.abs(a[1] - b[1])));
        }

        PDRectangle toUser(SignSlot s) {
            double[] a = user(s.x(), s.y());
            double[] b = user(s.x() + s.width(), s.y() + s.height());
            float x = (float) (Math.min(a[0], b[0]) + cx), y = (float) (Math.min(a[1], b[1]) + cy);
            return new PDRectangle(x, y, (float) Math.abs(a[0] - b[0]), (float) Math.abs(a[1] - b[1]));
        }

        private static double round(double v) {
            return Math.round(v * 100) / 100.0;
        }
    }
}
