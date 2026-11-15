package vn.vbi.ksvb.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Xuất đặc tả OpenAPI ({@code /v3/api-docs}) để frontend sinh kiểu TypeScript (ECOSYSTEM.md 12.3, 12.7).
 * Luôn ghi {@code target/openapi.json} (CI so với bản frontend dùng); đặt
 * {@code -Dksvb.openapi.out=../frontend/openapi/openapi.json} để cập nhật bản đó, rồi {@code npm run gen:api}.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("it")
class OpenApiExportTest {

    @Autowired MockMvc mvc;

    @Test
    void xuatSpecOpenApi() throws Exception {
        String spec = mvc.perform(get("/v3/api-docs")).andReturn().getResponse()
                .getContentAsString(StandardCharsets.UTF_8);
        assertThat(spec).contains("\"/api/sign-requests\"");
        // bỏ "servers" (phụ thuộc môi trường chạy test) để đặc tả ổn định giữa các lần xuất
        spec = spec.replaceFirst("\"servers\":\\[[^\\]]*\\],?", "");
        Files.writeString(Path.of("target/openapi.json"), spec, StandardCharsets.UTF_8);
        String out = System.getProperty("ksvb.openapi.out");
        if (out != null && !out.isBlank()) {
            Path p = Path.of(out);
            Files.createDirectories(p.toAbsolutePath().getParent());
            Files.writeString(p, spec, StandardCharsets.UTF_8);
        }
    }
}
