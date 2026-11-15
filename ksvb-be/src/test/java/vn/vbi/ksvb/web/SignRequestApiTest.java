package vn.vbi.ksvb.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/** Kiểm thử toàn tuyến: Flyway + JPA + controller trên PostgreSQL (Testcontainers), người dùng lấy từ header X-User-Id. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SignRequestApiTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    private JsonNode call(MvcResult r) throws Exception {
        return json.readTree(r.getResponse().getContentAsString(StandardCharsets.UTF_8));
    }

    private MvcResult as(long user, org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder b)
            throws Exception {
        return mvc.perform(b.header("X-User-Id", user)).andReturn();
    }

    @Test
    void danhSachChoToiKy_cuaNguoiDung4_cu2VanBan() throws Exception {
        mvc.perform(get("/api/sign-requests").param("scope", "pending").header("X-User-Id", 4))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(2))
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(10))
                .andExpect(jsonPath("$.totalPages").value(1));
    }

    @Test
    void scopeKhongHopLe_tra400() throws Exception {
        mvc.perform(get("/api/sign-requests").param("scope", "abc").header("X-User-Id", 4))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    void nguoiNgoaiKhongXemDuocVanBanRieng() throws Exception {
        JsonNode list = call(as(4, get("/api/sign-requests").param("scope", "mine")));
        long id = list.get("content").get(0).get("id").asLong();
        // người 10 không tham gia, không theo dõi, văn bản không chung
        mvc.perform(get("/api/sign-requests/" + id).header("X-User-Id", 10)).andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    @Test
    void luongDayDu_taoNhap_taiPdf_trinhKy_kyTuanTu_hoanThanh() throws Exception {
        String body = """
                {"title":"Hợp đồng thử nghiệm E2E","docType":"Hợp đồng","mode":"SEQ","deadline":"2099-01-01",
                 "signerIds":[1,2],"watcherIds":[5]}""";
        MvcResult created = as(4, post("/api/sign-requests").contentType(MediaType.APPLICATION_JSON).content(body));
        assertThat(created.getResponse().getStatus()).isEqualTo(201);
        long id = call(created).get("id").asLong();

        // chưa có tệp PDF → không trình ký được
        mvc.perform(post("/api/sign-requests/" + id + "/submit").header("X-User-Id", 4))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("BUSINESS_RULE"));

        // tệp giả đuôi pdf nhưng nội dung không phải PDF → bị từ chối
        mvc.perform(multipart("/api/sign-requests/" + id + "/attachments")
                        .file(new MockMultipartFile("file", "gia.pdf", "application/pdf", "khong phai pdf".getBytes()))
                        .header("X-User-Id", 4))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

        mvc.perform(multipart("/api/sign-requests/" + id + "/attachments")
                        .file(new MockMultipartFile("file", "hd.pdf", "application/pdf", "%PDF-1.4 demo".getBytes()))
                        .header("X-User-Id", 4))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.signable").value(true));

        mvc.perform(post("/api/sign-requests/" + id + "/submit").header("X-User-Id", 4))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.code").isNotEmpty());

        // người 2 chưa đến lượt
        mvc.perform(post("/api/sign-requests/" + id + "/sign").header("X-User-Id", 2)).andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("CONFLICT"));
        // người ngoài luồng
        mvc.perform(post("/api/sign-requests/" + id + "/sign").header("X-User-Id", 9)).andExpect(status().isForbidden());

        mvc.perform(post("/api/sign-requests/" + id + "/sign").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"note\":\"đồng ý\"}").header("X-User-Id", 1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDING"));

        mvc.perform(post("/api/sign-requests/" + id + "/sign").header("X-User-Id", 2))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COMPLETED"));

        // người theo dõi (5) xem và tải được tệp
        JsonNode detail = call(as(5, get("/api/sign-requests/" + id)));
        long att = detail.get("attachments").get(0).get("id").asLong();
        mvc.perform(get("/api/sign-requests/" + id + "/attachments/" + att).header("X-User-Id", 5))
                .andExpect(status().isOk());
        // người ngoài thì không
        mvc.perform(get("/api/sign-requests/" + id + "/attachments/" + att).header("X-User-Id", 10))
                .andExpect(status().isForbidden());
    }

    @Test
    void tuChoi_bat_buoc_lyDo() throws Exception {
        JsonNode list = call(as(4, get("/api/sign-requests").param("scope", "pending")));
        long id = list.get("content").get(0).get("id").asLong();

        mvc.perform(post("/api/sign-requests/" + id + "/reject").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"note\":\"\"}").header("X-User-Id", 4))
                .andExpect(status().isBadRequest());
    }

    @Test
    void validation_tieuDeTrong_tra400KemLoiTungTruong() throws Exception {
        mvc.perform(post("/api/sign-requests").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"\",\"docType\":\"Hợp đồng\",\"signerIds\":[1]}").header("X-User-Id", 4))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.errors[?(@.field == 'title')].message").exists());
    }

    @Test
    void xoaChiDuocBanNhapCuaMinh() throws Exception {
        JsonNode mine = call(as(4, get("/api/sign-requests").param("scope", "mine").param("status", "DRAFT")));
        long draftId = mine.get("content").get(0).get("id").asLong();

        mvc.perform(delete("/api/sign-requests/" + draftId).header("X-User-Id", 1)).andExpect(status().isConflict());
        mvc.perform(delete("/api/sign-requests/" + draftId).header("X-User-Id", 4)).andExpect(status().isNoContent());
    }

    @Test
    void dashboardVaQuyenQuanTri() throws Exception {
        mvc.perform(get("/api/dashboard").header("X-User-Id", 4))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pendingForMe").value(2))
                .andExpect(jsonPath("$.completedByMonth.length()").value(12));

        mvc.perform(get("/api/reports/summary").header("X-User-Id", 4)).andExpect(status().isForbidden());
        mvc.perform(get("/api/reports/summary").header("X-User-Id", 11)).andExpect(status().isOk());
        mvc.perform(get("/api/admin/users").header("X-User-Id", 4)).andExpect(status().isForbidden());
        mvc.perform(get("/api/admin/audit-logs").header("X-User-Id", 11)).andExpect(status().isOk());
    }

    @Test
    void mauNguoiNhan_chiThayMauCuaMinh() throws Exception {
        mvc.perform(get("/api/templates").header("X-User-Id", 4))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3));
        mvc.perform(get("/api/templates").header("X-User-Id", 1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }
}
