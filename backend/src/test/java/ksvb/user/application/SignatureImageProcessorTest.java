package ksvb.user.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.awt.BasicStroke;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import javax.imageio.ImageIO;
import ksvb.shared.error.BusinessException;
import org.junit.jupiter.api.Test;

class SignatureImageProcessorTest {

    private final SignatureImageProcessor processor = new SignatureImageProcessor();

    /** Ảnh 900x500: nền (có thể loang từ trái sang phải), một nét mực xanh đậm ở giữa. */
    private static BufferedImage paper(Color left, Color right, boolean withInk) {
        BufferedImage img = new BufferedImage(900, 500, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = img.createGraphics();
        g.setPaint(new java.awt.GradientPaint(0, 0, left, 900, 0, right));
        g.fillRect(0, 0, 900, 500);
        if (withInk) {
            g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            g.setColor(new Color(13, 46, 160));
            g.setStroke(new BasicStroke(8, BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND));
            g.drawLine(200, 250, 700, 250);
        }
        g.dispose();
        return img;
    }

    private static byte[] encode(BufferedImage img, String format) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(img, format, out);
        return out.toByteArray();
    }

    private static BufferedImage decode(byte[] png) throws IOException {
        return ImageIO.read(new ByteArrayInputStream(png));
    }

    @Test
    void nenTrang_netXanh_trongSuotQuanhNet_vaCatSat() throws IOException {
        BufferedImage out = decode(processor.process(encode(paper(Color.WHITE, Color.WHITE, true), "png")));

        assertThat(out.getColorModel().hasAlpha()).isTrue();
        // nét dài 500 + 2 đầu tròn + đệm 8 mỗi bên → rộng ~ 524, cao ~ 24
        assertThat(out.getWidth()).isBetween(510, 540);
        assertThat(out.getHeight()).isBetween(16, 40);
        assertThat(out.getRGB(0, 0) >>> 24).isZero();
        int center = out.getRGB(out.getWidth() / 2, out.getHeight() / 2);
        assertThat(center >>> 24).isEqualTo(255);
        assertThat(center & 0xff).isGreaterThan((center >> 16) & 0xff); // vẫn là mực xanh
    }

    @Test
    void jpgGiayNgaVangLoang_vanTachDuocNen() throws IOException {
        BufferedImage src = paper(new Color(233, 225, 200), new Color(190, 182, 160), true);
        BufferedImage out = decode(processor.process(encode(src, "jpg")));

        assertThat(out.getWidth()).isBetween(500, 560);
        assertThat(out.getRGB(1, 1) >>> 24).isZero();
        assertThat(out.getRGB(out.getWidth() - 2, 1) >>> 24).isZero();
        assertThat(out.getRGB(out.getWidth() / 2, out.getHeight() / 2) >>> 24).isEqualTo(255);
    }

    @Test
    void anhRong_thuVeToiDa600px() throws IOException {
        BufferedImage img = new BufferedImage(2000, 400, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = img.createGraphics();
        g.setColor(Color.WHITE);
        g.fillRect(0, 0, 2000, 400);
        g.setColor(Color.BLACK);
        g.setStroke(new BasicStroke(12));
        g.drawLine(50, 200, 1950, 200);
        g.dispose();

        BufferedImage out = decode(processor.process(encode(img, "png")));
        assertThat(out.getWidth()).isEqualTo(SignatureImageProcessor.MAX_OUT_WIDTH);
    }

    @Test
    void giayTrangTron_baoKhongCoChuKy() throws IOException {
        byte[] blank = encode(paper(Color.WHITE, Color.WHITE, false), "png");
        assertThatThrownBy(() -> processor.process(blank))
                .isInstanceOf(BusinessException.class)
                .extracting("code").isEqualTo("EMPTY_SIGNATURE");
    }

    @Test
    void khongPhaiAnh_baoInvalidImage() {
        assertThatThrownBy(() -> processor.process("%PDF-1.7 abc".getBytes()))
                .isInstanceOf(BusinessException.class)
                .extracting("code").isEqualTo("INVALID_IMAGE");
        // đầu tệp giống PNG nhưng nội dung hỏng
        byte[] broken = {(byte) 0x89, 'P', 'N', 'G', 13, 10, 26, 10, 1, 2, 3};
        assertThatThrownBy(() -> processor.process(broken))
                .isInstanceOf(BusinessException.class)
                .extracting("code").isEqualTo("INVALID_IMAGE");
    }

    @Test
    void tepQuaLon_baoFileTooLarge() {
        byte[] big = new byte[SignatureImageProcessor.MAX_BYTES + 1];
        assertThatThrownBy(() -> processor.process(big))
                .isInstanceOf(BusinessException.class)
                .extracting("code").isEqualTo("FILE_TOO_LARGE");
    }
}
