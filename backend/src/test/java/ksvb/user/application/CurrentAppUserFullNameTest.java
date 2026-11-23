package ksvb.user.application;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;

class CurrentAppUserFullNameTest {

    private static Jwt jwt(Map<String, Object> claims) {
        Jwt.Builder b = Jwt.withTokenValue("t").header("alg", "none").issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(60)).subject("s");
        claims.forEach(b::claim);
        return b.build();
    }

    @Test
    void ghepHoDemTruocTenSauTheoThuTuViet() {
        Jwt j = jwt(Map.of("name", "Đoàn Nguyễn Đình", "family_name", "Nguyễn Đình", "given_name", "Đoàn"));
        assertThat(CurrentAppUser.fullName(j)).isEqualTo("Nguyễn Đình Đoàn");
    }

    @Test
    void thieuHoacTenThiDungClaimName() {
        assertThat(CurrentAppUser.fullName(jwt(Map.of("name", "Nguyễn Bích Hạnh", "given_name", "Hạnh"))))
                .isEqualTo("Nguyễn Bích Hạnh");
    }

    @Test
    void khongCoGiDungPreferredUsername() {
        assertThat(CurrentAppUser.fullName(jwt(Map.of("preferred_username", "doannd")))).isEqualTo("doannd");
    }
}
