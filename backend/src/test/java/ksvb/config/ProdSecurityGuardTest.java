package ksvb.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import ksvb.KsvbApplication;
import org.junit.jupiter.api.Test;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

/** Profile prod không được khởi động khi tắt bảo mật (bỏ qua đăng nhập). */
@Testcontainers(disabledWithoutDocker = true)
class ProdSecurityGuardTest {

    @Container
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:17-alpine");

    private ConfigurableApplicationContext run(String... extra) {
        String[] base = {
            "--server.port=0",
            "--spring.profiles.active=it,prod",
            "--spring.datasource.url=" + POSTGRES.getJdbcUrl(),
            "--spring.datasource.username=" + POSTGRES.getUsername(),
            "--spring.datasource.password=" + POSTGRES.getPassword(),
        };
        String[] all = new String[base.length + extra.length];
        System.arraycopy(base, 0, all, 0, base.length);
        System.arraycopy(extra, 0, all, base.length, extra.length);
        return new SpringApplicationBuilder(KsvbApplication.class).run(all);
    }

    @Test
    void prodTuChoiKhiTatBaoMat() {
        assertThatThrownBy(() -> run("--ksvb.security.enabled=false"))
                .hasStackTraceContaining("không được phép khi chạy profile prod");
    }

    @Test
    void prodKhoiDongBinhThuongKhiBatBaoMat() {
        try (var ctx = run("--ksvb.security.enabled=true")) {
            assertThat(ctx.isActive()).isTrue();
        }
    }
}
