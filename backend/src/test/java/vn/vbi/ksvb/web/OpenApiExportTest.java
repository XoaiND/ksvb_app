package vn.vbi.ksvb.web;

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
 * Xuất spec OpenAPI ra {@code target/openapi/ksvb-api.json} để FE sinh kiểu TypeScript
 * ({@code npm run gen:api} trong ksvb-fe), khỏi phải chạy server. ECOSYSTEM.md 12.3.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class OpenApiExportTest {

    @Autowired MockMvc mvc;

    @Test
    void xuatSpecOpenApi() throws Exception {
        String spec = mvc.perform(get("/v3/api-docs")).andReturn().getResponse()
                .getContentAsString(StandardCharsets.UTF_8);
        assertThat(spec).contains("\"/api/sign-requests\"");
        Path out = Path.of("target", "openapi", "ksvb-api.json");
        Files.createDirectories(out.getParent());
        Files.writeString(out, spec, StandardCharsets.UTF_8);
    }
}
