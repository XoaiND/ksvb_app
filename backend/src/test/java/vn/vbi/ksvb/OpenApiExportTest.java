package vn.vbi.ksvb;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.env.Environment;

/**
 * Xuất đặc tả OpenAPI ({@code /v3/api-docs}) của backend chạy thật để frontend sinh kiểu TypeScript (ECOSYSTEM.md 12.3).
 * Luôn ghi {@code target/openapi.json}; đặt {@code -Dksvb.openapi.out=../frontend/openapi/openapi.json} để cập nhật bản
 * frontend dùng, rồi chạy {@code npm run gen:api} trong {@code frontend/}.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class OpenApiExportTest extends PostgresIntegrationTest {

    @Autowired
    Environment env;

    @Test
    void exportOpenApiSpec() throws Exception {
        String port = env.getProperty("local.server.port");
        HttpResponse<String> res = HttpClient.newHttpClient()
                .send(
                        HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/v3/api-docs"))
                                .build(),
                        HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));

        assertThat(res.statusCode()).isEqualTo(200);
        assertThat(res.body()).contains("\"openapi\"", "/api/me");

        // bo "servers" (chua cong ngau nhien cua lan chay test) de dac ta on dinh giua cac lan xuat
        String spec = res.body().replaceFirst("\"servers\":\\[[^\\]]*\\],?", "");
        Files.writeString(Path.of("target/openapi.json"), spec, StandardCharsets.UTF_8);
        String out = System.getProperty("ksvb.openapi.out");
        if (out != null && !out.isBlank()) {
            Path p = Path.of(out);
            Files.createDirectories(p.toAbsolutePath().getParent());
            Files.writeString(p, spec, StandardCharsets.UTF_8);
        }
    }
}
