package vn.vbi.ksvb;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * Nền cho test tích hợp: PostgreSQL thật trong Docker (Testcontainers), Flyway chạy V1..Vn rồi Hibernate
 * {@code ddl-auto=validate}. Container là bean nên sống cùng context Spring được cache (dùng chung cho mọi lớp con).
 * Không có Docker thì test bị bỏ qua. Cấu hình riêng ở {@code src/test/resources/application-it.yml}.
 */
@SpringBootTest
@ActiveProfiles("it")
@Import(PostgresIntegrationTest.Containers.class)
@Testcontainers(disabledWithoutDocker = true)
public abstract class PostgresIntegrationTest {

    @TestConfiguration(proxyBeanMethods = false)
    static class Containers {
        @Bean
        @ServiceConnection
        PostgreSQLContainer postgres() {
            return new PostgreSQLContainer("postgres:17-alpine");
        }
    }
}
