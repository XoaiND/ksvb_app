package vn.vbi.ksvb.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import vn.vbi.ksvb.KsvbApplication;

/** Profile prod từ chối khởi động nếu tắt bảo mật (không cho bỏ qua đăng nhập ở môi trường thật). */
@Testcontainers(disabledWithoutDocker = true)
class ProdSecurityGuardTest {

    @Configuration(proxyBeanMethods = false)
    static class Db {
        @Bean
        @ServiceConnection
        PostgreSQLContainer postgres() {
            return new PostgreSQLContainer("postgres:17-alpine");
        }
    }

    @Test
    void prodTatBaoMatKhongKhoiDong() {
        SpringApplicationBuilder app = new SpringApplicationBuilder(KsvbApplication.class, Db.class)
                .web(WebApplicationType.SERVLET)
                .profiles("it", "prod")
                .properties("server.port=0");
        assertThatThrownBy(() -> app.run("--ksvb.security.enabled=false").close()).satisfies(e -> {
            Throwable root = e;
            while (root.getCause() != null) {
                root = root.getCause();
            }
            assertThat(root).isInstanceOf(IllegalStateException.class).hasMessageContaining("profile prod");
        });
    }
}
