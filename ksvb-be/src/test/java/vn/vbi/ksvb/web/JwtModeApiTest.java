package vn.vbi.ksvb.web;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.JwtRequestPostProcessor;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Chế độ chạy thật (ksvb.security.enabled=true): bắt buộc JWT, quyền = client role, người dùng tạo từ claim.
 * Token giả lập bằng jwt() của spring-security-test (không gọi Keycloak). DB riêng để không lẫn với test dev.
 */
@SpringBootTest(properties = {
        "ksvb.security.enabled=true",
        "spring.datasource.url=jdbc:tc:postgresql:17-alpine:///ksvbjwt"
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class JwtModeApiTest {

    @Autowired MockMvc mvc;

    private static JwtRequestPostProcessor token(String email, String... permissions) {
        return jwt().jwt(j -> j.claim("email", email).claim("name", "Nguyễn Thử Nghiệm")
                        .claim("employee_code", "NV000099").claim("unit_code", "DV00007")
                        .claim("position_code", "CD020").claim("preferred_username", "thu.nghiem"))
                .authorities(java.util.Arrays.stream(permissions).map(SimpleGrantedAuthority::new)
                        .toArray(GrantedAuthority[]::new));
    }

    @Test
    void khongCoToken_tra401() throws Exception {
        mvc.perform(get("/api/me")).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"))
                .andExpect(jsonPath("$.detail").isNotEmpty());
        mvc.perform(get("/api/sign-requests")).andExpect(status().isUnauthorized());
    }

    @Test
    void headerDevBiBoQua_khiBatKeycloak() throws Exception {
        mvc.perform(get("/api/me").header("X-User-Id", 4)).andExpect(status().isUnauthorized());
    }

    @Test
    void dangNhapLanDau_tuTaoNguoiDungTuClaim_vaTraQuyenTuToken() throws Exception {
        mvc.perform(get("/api/me").with(token("thu.nghiem@congty.vn", "document.create", "document.sign")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("thu.nghiem@congty.vn"))
                .andExpect(jsonPath("$.fullName").value("Nguyễn Thử Nghiệm"))
                .andExpect(jsonPath("$.employeeCode").value("NV000099"))
                .andExpect(jsonPath("$.unitName").value("DV00007"))
                .andExpect(jsonPath("$.jobTitle").value("CD020"))
                .andExpect(jsonPath("$.permissions[0]").value("document.create"))
                .andExpect(jsonPath("$.permissions.length()").value(2));

        // lần sau dùng lại đúng bản ghi (không tạo trùng)
        mvc.perform(get("/api/users").with(token("thu.nghiem@congty.vn", "document.create")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.email=='thu.nghiem@congty.vn')]", hasSize(1)));
    }

    @Test
    void thieuQuyen_tra403() throws Exception {
        String body = "{\"title\":\"Thử\",\"docType\":\"Hợp đồng\",\"signerIds\":[1]}";
        // đăng nhập được nhưng không có role nào của ksvb-api
        mvc.perform(post("/api/sign-requests").contentType(MediaType.APPLICATION_JSON).content(body)
                        .with(token("khong.quyen@congty.vn")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
        // chỉ có quyền ký, không có quyền soạn
        mvc.perform(post("/api/sign-requests").contentType(MediaType.APPLICATION_JSON).content(body)
                        .with(token("chi.ky@congty.vn", "document.sign")))
                .andExpect(status().isForbidden());
        // báo cáo và quản trị cần quyền riêng
        mvc.perform(get("/api/reports/summary").with(token("khong.quyen@congty.vn", "document.create")))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/admin/users").with(token("khong.quyen@congty.vn", "document.create")))
                .andExpect(status().isForbidden());
    }

    @Test
    void coQuyen_baoCaoVaQuanTriDuocPhep() throws Exception {
        mvc.perform(get("/api/reports/summary").with(token("lanh.dao@congty.vn", "report.view")))
                .andExpect(status().isOk());
        mvc.perform(get("/api/admin/users").with(token("qt@congty.vn", "user.manage")))
                .andExpect(status().isOk());
    }

    @Test
    void actuatorHealthMo_cacEndpointKhacCanQuyen() throws Exception {
        mvc.perform(get("/actuator/health")).andExpect(status().isOk());
        mvc.perform(get("/actuator/health/liveness")).andExpect(status().isOk());
        mvc.perform(get("/actuator/health/readiness")).andExpect(status().isOk());
        mvc.perform(get("/actuator/info").with(token("a@congty.vn", "document.create")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }
}
