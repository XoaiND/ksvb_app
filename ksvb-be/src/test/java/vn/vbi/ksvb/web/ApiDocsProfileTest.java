package vn.vbi.ksvb.web;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

/** Swagger/OpenAPI: bật ở dev, mặc định tắt ở profile prod (ECOSYSTEM.md 12.5). */
class ApiDocsProfileTest {

    @Nested
    @SpringBootTest
    @AutoConfigureMockMvc
    @ActiveProfiles("test")
    class Dev {
        @Autowired MockMvc mvc;

        @Test
        void apiDocsBat() throws Exception {
            mvc.perform(get("/v3/api-docs")).andExpect(status().isOk());
        }
    }

    @Nested
    @SpringBootTest(properties = {
            "ksvb.storage.path=./target/test-upload",
            "spring.datasource.url=jdbc:h2:mem:ksvbprod;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH;DB_CLOSE_DELAY=-1"
    })
    @AutoConfigureMockMvc
    @ActiveProfiles({"test", "prod"})
    class Prod {
        @Autowired MockMvc mvc;

        @Test
        void apiDocsTat() throws Exception {
            // prod bật bắt buộc đăng nhập; /v3/api-docs vẫn permitAll nên 404 nghĩa là springdoc đã tắt
            mvc.perform(get("/v3/api-docs")).andExpect(status().isNotFound());
        }
    }
}
