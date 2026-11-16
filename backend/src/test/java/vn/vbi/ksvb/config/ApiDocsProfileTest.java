package vn.vbi.ksvb.config;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import vn.vbi.ksvb.PostgresIntegrationTest;

/** Swagger/OpenAPI: bật ở dev, mặc định tắt ở profile prod (docs/kien-truc-chuan.md). */
class ApiDocsProfileTest {

    @Nested
    @AutoConfigureMockMvc
    class Dev extends PostgresIntegrationTest {
        @Autowired MockMvc mvc;

        @Test
        void apiDocsBat() throws Exception {
            mvc.perform(get("/v3/api-docs")).andExpect(status().isOk());
        }
    }

    @Nested
    @SpringBootTest
    @AutoConfigureMockMvc
    @ActiveProfiles({"it", "prod"})
    class Prod extends PostgresIntegrationTest {
        @Autowired MockMvc mvc;

        @Test
        void apiDocsTat() throws Exception {
            // prod bật bắt buộc đăng nhập; /v3/api-docs vẫn permitAll nên 404 nghĩa là springdoc đã tắt
            mvc.perform(get("/v3/api-docs")).andExpect(status().isNotFound());
        }
    }
}
