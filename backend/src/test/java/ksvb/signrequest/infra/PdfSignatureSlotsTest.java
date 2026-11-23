package ksvb.signrequest.infra;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.ByteArrayOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import ksvb.shared.error.BusinessException;
import ksvb.signrequest.domain.SignSlot;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.interactive.annotation.PDAnnotation;
import org.apache.pdfbox.pdmodel.interactive.annotation.PDAnnotationSquare;
import org.apache.pdfbox.pdmodel.interactive.annotation.PDAnnotationText;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class PdfSignatureSlotsTest {

    private final PdfSignatureSlots pdf = new PdfSignatureSlots();

    @TempDir Path dir;

    /** PDF như do Foxit/Acrobat tạo: hai trang A4, ô Square nội dung "2" ở trang 2, một ghi chú thường (không phải ô). */
    private Path foreignPdf(int rotation) throws Exception {
        try (PDDocument doc = new PDDocument()) {
            doc.addPage(new PDPage(PDRectangle.A4));
            PDPage p2 = new PDPage(PDRectangle.A4);
            p2.setRotation(rotation);
            doc.addPage(p2);
            PDAnnotationSquare sq = new PDAnnotationSquare();
            sq.setRectangle(new PDRectangle(100, 200, 150, 60)); // x 100..250, y 200..260 (gốc dưới-trái)
            sq.setContents(" #2 ");
            PDAnnotationText note = new PDAnnotationText();
            note.setRectangle(new PDRectangle(10, 10, 20, 20));
            note.setContents("Ghi chú: xem lại điều 3");
            p2.setAnnotations(List.of(sq, note));
            Path f = dir.resolve("in-" + rotation + ".pdf");
            doc.save(f.toFile());
            return f;
        }
    }

    private Path save(byte[] content, String name) throws Exception {
        Path f = dir.resolve(name);
        Files.write(f, content);
        return f;
    }

    @Test
    void docOSquareCoSan_doiToaDoVeGocTrenTrai() throws Exception {
        PdfSignatureSlots.Layout l = pdf.read(foreignPdf(0));

        assertThat(l.pages()).hasSize(2);
        assertThat(l.pages().get(0).width()).isEqualTo(595.28, org.assertj.core.data.Offset.offset(0.01));
        assertThat(l.slots()).containsExactly(new SignSlot(2, 2, 100, 841.89 - 260, 150, 60));
    }

    @Test
    void ghiLai_giuGhiChuThuong_xoaOCu_themOMoi_docLaiKhop() throws Exception {
        Path in = foreignPdf(0);
        List<SignSlot> want = List.of(new SignSlot(1, 1, 72, 500, 170, 70), new SignSlot(2, 2, 300, 650, 120, 50));
        Path out = save(pdf.write(in, want), "out.pdf");

        assertThat(pdf.read(out).slots()).containsExactlyElementsOf(want);
        try (PDDocument doc = Loader.loadPDF(out.toFile())) {
            List<PDAnnotation> p2 = doc.getPage(1).getAnnotations();
            assertThat(p2).extracting(PDAnnotation::getContents).contains("Ghi chú: xem lại điều 3");
            assertThat(p2).extracting(PDAnnotation::getSubtype).doesNotContain("Square");
        }
    }

    @Test
    void trangXoay90_ghiRoiDocLaiKhop_vaKichThuocTrangDaXoay() throws Exception {
        Path in = foreignPdf(90);
        PdfSignatureSlots.Layout l = pdf.read(in);
        assertThat(l.pages().get(1).width()).isEqualTo(841.89, org.assertj.core.data.Offset.offset(0.01));
        // ô Square (x 100..250, y 200..260) trên trang xoay 90°: hiển thị x = y gốc, y = x gốc
        assertThat(l.slots()).containsExactly(new SignSlot(2, 2, 200, 100, 60, 150));

        List<SignSlot> want = List.of(new SignSlot(1, 2, 500, 300, 160, 64));
        assertThat(pdf.read(save(pdf.write(in, want), "rot.pdf")).slots()).containsExactlyElementsOf(want);
    }

    private static byte[] png() throws Exception {
        java.awt.image.BufferedImage img = new java.awt.image.BufferedImage(300, 100,
                java.awt.image.BufferedImage.TYPE_INT_ARGB);
        java.awt.Graphics2D g = img.createGraphics();
        g.setColor(java.awt.Color.BLUE);
        g.fillRect(20, 40, 260, 20);
        g.dispose();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        javax.imageio.ImageIO.write(img, "png", out);
        return out.toByteArray();
    }

    @Test
    void dongChuKy_vaoDungO_xoaOCuaNguoiDo_giuOCuaNguoiKhac_chuTiengViet() throws Exception {
        Path in = save(pdf.samplePdf("Hop dong", 2), "two.pdf");
        byte[] out = pdf.stamp(in, 1, png(), List.of("Nguyễn Văn Đức Ưng", "22/11/2026 09:15"));
        assertThat(out).isNotNull();
        Path signed = save(out, "signed.pdf");

        assertThat(pdf.read(signed).slots()).extracting(SignSlot::orderNo).containsExactly(2);
        try (PDDocument doc = Loader.loadPDF(signed.toFile())) {
            var res = doc.getPage(0).getResources();
            assertThat(res.getXObjectNames()).isNotEmpty(); // ảnh chữ ký
            String text = new org.apache.pdfbox.text.PDFTextStripper().getText(doc);
            assertThat(text).contains("Nguyễn Văn Đức Ưng").contains("22/11/2026 09:15");
        }
        // người không có ô trong tệp
        assertThat(pdf.stamp(signed, 1, png(), List.of())).isNull();
    }

    @Test
    void dongChuKy_trangXoay90_anhNamTrongO() throws Exception {
        Path in = foreignPdf(90); // ô số 2 trang 2, hiển thị x 200..260, y 100..250
        Path signed = save(pdf.stamp(in, 2, png(), List.of()), "rot-signed.pdf");
        try (PDDocument doc = Loader.loadPDF(signed.toFile())) {
            BufferedImageCheck.assertInkInside(new org.apache.pdfbox.rendering.PDFRenderer(doc)
                    .renderImageWithDPI(1, 72), 200, 100, 60, 150);
        }
    }

    /** Ảnh render 72 dpi: 1 px = 1 point; mực xanh chỉ nằm trong ô (theo trang hiển thị). */
    private static final class BufferedImageCheck {
        static void assertInkInside(java.awt.image.BufferedImage img, int x, int y, int w, int h) {
            int inside = 0, outside = 0;
            for (int py = 0; py < img.getHeight(); py++) {
                for (int px = 0; px < img.getWidth(); px++) {
                    int rgb = img.getRGB(px, py);
                    boolean blue = (rgb & 0xff) > 150 && ((rgb >> 16) & 0xff) < 100;
                    if (!blue) continue;
                    if (px >= x - 1 && px <= x + w + 1 && py >= y - 1 && py <= y + h + 1) inside++;
                    else outside++;
                }
            }
            assertThat(inside).isPositive();
            assertThat(outside).isZero();
        }
    }

    @Test
    void oNamNgoaiSoTrang_baoLoi() throws Exception {
        Path in = foreignPdf(0);
        assertThatThrownBy(() -> pdf.write(in, List.of(new SignSlot(1, 3, 10, 10, 50, 20))))
                .isInstanceOf(BusinessException.class).extracting("code").isEqualTo("INVALID_SLOT");
    }

    @Test
    void renderTrang_raJpeg_vaTrangKhongTonTaiBaoLoi() throws Exception {
        Path in = save(pdf.samplePdf("Hợp đồng mẫu", 2), "s.pdf");
        byte[] jpg = pdf.renderPage(in, 1);
        assertThat(jpg[0] & 0xff).isEqualTo(0xFF);
        assertThat(jpg[1] & 0xff).isEqualTo(0xD8);
        assertThatThrownBy(() -> pdf.renderPage(in, 2)).isInstanceOf(BusinessException.class)
                .extracting("code").isEqualTo("INVALID_PAGE");
        assertThat(pdf.read(in).slots()).extracting(SignSlot::orderNo).containsExactly(1, 2);
    }

    @Test
    void validate_tuChoiNoiDungHong_vaPdfKhongTrang() throws Exception {
        assertThatThrownBy(() -> pdf.validate("%PDF-1.4 hong".getBytes()))
                .isInstanceOf(BusinessException.class).extracting("code").isEqualTo("INVALID_PDF");
        ByteArrayOutputStream empty = new ByteArrayOutputStream();
        try (PDDocument doc = new PDDocument()) {
            doc.save(empty);
        }
        assertThatThrownBy(() -> pdf.validate(empty.toByteArray()))
                .isInstanceOf(BusinessException.class).extracting("code").isEqualTo("INVALID_PDF");
    }
}
