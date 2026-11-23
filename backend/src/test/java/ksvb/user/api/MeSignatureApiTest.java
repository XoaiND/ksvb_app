package ksvb.user.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.awt.BasicStroke;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.stream.Stream;
import javax.imageio.ImageIO;
import ksvb.PostgresIntegrationTest;
import ksvb.config.KsvbProperties;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;

/** Ảnh chữ ký của người đang đăng nhập: xem trước, lưu, thay, xoá (PostgreSQL thật + thư mục lưu tệp thật). */
@AutoConfigureMockMvc
class MeSignatureApiTest extends PostgresIntegrationTest {

    private static final long USER = 7;

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired KsvbProperties props;

    private static MockMultipartFile signaturePng() throws Exception {
        BufferedImage img = new BufferedImage(600, 300, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = img.createGraphics();
        g.setColor(Color.WHITE);
        g.fillRect(0, 0, 600, 300);
        g.setColor(new Color(10, 40, 150));
        g.setStroke(new BasicStroke(6));
        g.drawLine(100, 150, 500, 160);
        g.dispose();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(img, "png", out);
        return new MockMultipartFile("file", "chu-ky.png", "image/png", out.toByteArray());
    }

    private Path dir() {
        return Path.of(props.storage().path()).toAbsolutePath().normalize().resolve("signature");
    }

    private long fileCount() throws Exception {
        if (!Files.isDirectory(dir())) return 0;
        try (Stream<Path> s = Files.list(dir())) {
            return s.count();
        }
    }

    @Test
    void xemTruoc_luu_thay_xoa() throws Exception {
        long before = fileCount();

        // xem trước: trả ảnh, không lưu tệp, me chưa có chữ ký
        mvc.perform(multipart("/api/me/signature/preview").file(signaturePng()).header("X-User-Id", USER))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.imageDataUrl").value(org.hamcrest.Matchers.startsWith("data:image/png;base64,")))
                .andExpect(jsonPath("$.updatedAt").doesNotExist());
        assertThat(fileCount()).isEqualTo(before);
        mvc.perform(get("/api/me").header("X-User-Id", USER)).andExpect(jsonPath("$.hasSignature").value(false));
        mvc.perform(get("/api/me/signature").header("X-User-Id", USER)).andExpect(status().isNotFound());

        // lưu
        mvc.perform(multipart("/api/me/signature").file(signaturePng()).header("X-User-Id", USER))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.updatedAt").isNotEmpty());
        assertThat(fileCount()).isEqualTo(before + 1);
        mvc.perform(get("/api/me").header("X-User-Id", USER))
                .andExpect(jsonPath("$.hasSignature").value(true))
                .andExpect(jsonPath("$.signatureUpdatedAt").isNotEmpty());
        String saved = json.readTree(mvc.perform(get("/api/me/signature").header("X-User-Id", USER))
                        .andExpect(status().isOk()).andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8))
                .get("imageDataUrl").asString();
        assertThat(saved).startsWith("data:image/png;base64,");

        // thay ảnh: tệp cũ bị xoá sau commit → vẫn chỉ 1 tệp của người này
        mvc.perform(multipart("/api/me/signature").file(signaturePng()).header("X-User-Id", USER))
                .andExpect(status().isOk());
        assertThat(fileCount()).isEqualTo(before + 1);

        // xoá
        mvc.perform(delete("/api/me/signature").header("X-User-Id", USER)).andExpect(status().isNoContent());
        assertThat(fileCount()).isEqualTo(before);
        mvc.perform(get("/api/me/signature").header("X-User-Id", USER)).andExpect(status().isNotFound());
        mvc.perform(delete("/api/me/signature").header("X-User-Id", USER)).andExpect(status().isNotFound());
    }

    @Test
    void anhKhongHopLe_tra422() throws Exception {
        mvc.perform(multipart("/api/me/signature")
                        .file(new MockMultipartFile("file", "x.png", "image/png", "khong phai anh".getBytes()))
                        .header("X-User-Id", USER))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("BUSINESS_RULE"))
                .andExpect(jsonPath("$.reason").value("INVALID_IMAGE"));
    }
}
