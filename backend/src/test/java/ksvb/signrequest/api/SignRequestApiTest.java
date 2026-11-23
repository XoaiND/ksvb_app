package ksvb.signrequest.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import ksvb.PostgresIntegrationTest;
import ksvb.signrequest.infra.PdfSignatureSlots;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/** Kiểm thử toàn tuyến: Flyway + JPA + controller trên PostgreSQL (Testcontainers), người dùng lấy từ header X-User-Id. */
@AutoConfigureMockMvc
class SignRequestApiTest extends PostgresIntegrationTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired PdfSignatureSlots pdf;

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
    void scopeKhongHopLe_tra422() throws Exception {
        mvc.perform(get("/api/sign-requests").param("scope", "abc").header("X-User-Id", 4))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("BUSINESS_RULE"))
                .andExpect(jsonPath("$.reason").value("INVALID_SCOPE"));
    }

    @Test
    void buocKy_luuTheoNguoi_vaBuocSaiBao422() throws Exception {
        MvcResult created = as(4, post("/api/sign-requests").contentType(MediaType.APPLICATION_JSON).content("""
                {"title":"Theo bước","docType":"Hợp đồng","mode":"SEQ","signerIds":[1,2,3],"signerSteps":[1,1,2]}"""));
        assertThat(created.getResponse().getStatus()).isEqualTo(201);
        JsonNode d = call(created);
        assertThat(d.get("mode").asString()).isEqualTo("SEQ");
        assertThat(d.get("participants").get(1).get("stepNo").asInt()).isEqualTo(1);
        assertThat(d.get("participants").get(2).get("stepNo").asInt()).isEqualTo(2);

        mvc.perform(post("/api/sign-requests").contentType(MediaType.APPLICATION_JSON).header("X-User-Id", 4).content("""
                        {"title":"Sai bước","docType":"Hợp đồng","mode":"SEQ","signerIds":[1,2],"signerSteps":[1,3]}"""))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.reason").value("INVALID_STEPS"));
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
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("BUSINESS_RULE"));

        // tệp giả đuôi pdf nhưng nội dung không phải PDF → bị từ chối
        mvc.perform(multipart("/api/sign-requests/" + id + "/attachments")
                        .file(new MockMultipartFile("file", "gia.pdf", "application/pdf", "khong phai pdf".getBytes()))
                        .header("X-User-Id", 4))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("BUSINESS_RULE"))
                .andExpect(jsonPath("$.reason").value("INVALID_PDF"));

        // PDF chỉ có sẵn ô ký số 1 (annotation) trong khi có 2 người ký
        MvcResult up = mvc.perform(multipart("/api/sign-requests/" + id + "/attachments")
                .file(new MockMultipartFile("file", "hd.pdf", "application/pdf", pdf.samplePdf("Hop dong", 1)))
                .header("X-User-Id", 4)).andReturn();
        assertThat(up.getResponse().getStatus()).isEqualTo(201);
        assertThat(call(up).get("signable").asBoolean()).isTrue();
        long pdfId = call(up).get("id").asLong();
        String slotsUrl = "/api/sign-requests/" + id + "/attachments/" + pdfId + "/slots";

        mvc.perform(get(slotsUrl).header("X-User-Id", 4))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pages.length()").value(1))
                .andExpect(jsonPath("$.pages[0].width").value(595.28))
                .andExpect(jsonPath("$.slots.length()").value(1))
                .andExpect(jsonPath("$.slots[0].orderNo").value(1))
                .andExpect(jsonPath("$.slots[0].x").value(72.0))
                .andExpect(jsonPath("$.slots[0].y").value(470.0));

        // thiếu ô số 2 → không trình ký được
        mvc.perform(post("/api/sign-requests/" + id + "/submit").header("X-User-Id", 4))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.reason").value("SIGN_SLOTS_MISMATCH"));

        // người không phải người tạo không đặt được ô
        String twoSlots = """
                {"slots":[{"orderNo":1,"page":1,"x":72,"y":470,"width":170,"height":70},
                          {"orderNo":2,"page":1,"x":330,"y":600,"width":150,"height":60}]}""";
        mvc.perform(put(slotsUrl).contentType(MediaType.APPLICATION_JSON).content(twoSlots).header("X-User-Id", 1))
                .andExpect(status().isForbidden());
        // trang không tồn tại
        mvc.perform(put(slotsUrl).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"slots\":[{\"orderNo\":1,\"page\":3,\"x\":1,\"y\":1,\"width\":50,\"height\":20}]}")
                        .header("X-User-Id", 4))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.reason").value("INVALID_SLOT"));

        mvc.perform(put(slotsUrl).contentType(MediaType.APPLICATION_JSON).content(twoSlots).header("X-User-Id", 4))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.slots.length()").value(2))
                .andExpect(jsonPath("$.slots[1].orderNo").value(2))
                .andExpect(jsonPath("$.slots[1].x").value(330.0))
                .andExpect(jsonPath("$.slots[1].width").value(150.0));

        mvc.perform(get("/api/sign-requests/" + id + "/attachments/" + pdfId + "/pages/1").header("X-User-Id", 5))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.imageDataUrl").value(org.hamcrest.Matchers.startsWith("data:image/jpeg;base64,")));

        // ảnh chữ ký của người ký (để xem trước ô ký): ai xem được văn bản thì xem được; người ngoài thì không
        mvc.perform(get("/api/sign-requests/" + id + "/signer-signatures").header("X-User-Id", 5))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].userId").value(1))
                .andExpect(jsonPath("$[0].imageDataUrl").value(org.hamcrest.Matchers.startsWith("data:image/png;base64,")));
        mvc.perform(get("/api/sign-requests/" + id + "/signer-signatures").header("X-User-Id", 10))
                .andExpect(status().isForbidden());

        mvc.perform(post("/api/sign-requests/" + id + "/submit").header("X-User-Id", 4))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.code").isNotEmpty());

        // người 2 chưa đến lượt
        mvc.perform(post("/api/sign-requests/" + id + "/sign").header("X-User-Id", 2)).andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("CONFLICT"));
        // thao tác bị chặn vẫn có trong nhật ký (result=ERROR, transaction riêng)
        mvc.perform(get("/api/admin/audit-logs").param("size", "100").header("X-User-Id", 11))
                .andExpect(jsonPath("$.content[?(@.action == 'BLOCKED' && @.target == 'POST /api/sign-requests/" + id
                        + "/sign' && @.result == 'ERROR')]").exists());
        // người ngoài luồng
        mvc.perform(post("/api/sign-requests/" + id + "/sign").header("X-User-Id", 9)).andExpect(status().isForbidden());

        mvc.perform(post("/api/sign-requests/" + id + "/sign").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"note\":\"đồng ý\"}").header("X-User-Id", 1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDING"));

        mvc.perform(post("/api/sign-requests/" + id + "/sign").header("X-User-Id", 2))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COMPLETED"));

        // người theo dõi (5) xem và tải được tệp; đã có bản đóng chữ ký, các ô ký đã được thay bằng chữ ký
        JsonNode detail = call(as(5, get("/api/sign-requests/" + id)));
        long att = detail.get("attachments").get(0).get("id").asLong();
        assertThat(detail.get("attachments").get(0).get("signed").asBoolean()).isTrue();
        mvc.perform(get("/api/sign-requests/" + id + "/attachments/" + att).header("X-User-Id", 5))
                .andExpect(status().isOk());
        MvcResult signedPdf = mvc.perform(get("/api/sign-requests/" + id + "/attachments/" + att).param("signed", "true")
                        .header("X-User-Id", 5))
                .andExpect(status().isOk()).andReturn();
        assertThat(signedPdf.getResponse().getHeader("Content-Disposition")).contains("UTF-8''hd%20%28%C4%91%C3%A3%20k%C3%BD%29.pdf");
        byte[] signedBytes = signedPdf.getResponse().getContentAsByteArray();
        assertThat(new String(signedBytes, 0, 5)).isEqualTo("%PDF-");
        // thông tin bản đã ký khớp tệp tải về
        JsonNode a0 = detail.get("attachments").get(0);
        assertThat(a0.get("signedSizeBytes").asLong()).isEqualTo(signedBytes.length);
        assertThat(a0.get("signedSha256").asString()).isEqualTo(java.util.HexFormat.of()
                .formatHex(java.security.MessageDigest.getInstance("SHA-256").digest(signedBytes)));
        assertThat(a0.get("signedAt").isNull()).isFalse();
        mvc.perform(get("/api/sign-requests/" + id + "/attachments/" + att + "/pages/1").param("original", "true")
                        .header("X-User-Id", 5))
                .andExpect(status().isOk());
        mvc.perform(get(slotsUrl).header("X-User-Id", 5)).andExpect(jsonPath("$.slots.length()").value(0));
        // người ngoài thì không
        mvc.perform(get("/api/sign-requests/" + id + "/attachments/" + att).header("X-User-Id", 10))
                .andExpect(status().isForbidden());
    }

    @Test
    void kyKhiChuaCoAnhChuKy_bao422_vanBanGiuNguyen() throws Exception {
        // người 5 chưa có ảnh chữ ký (dữ liệu mẫu chỉ có cho 1, 2, 3, 6)
        MvcResult created = as(4, post("/api/sign-requests").contentType(MediaType.APPLICATION_JSON).content("""
                {"title":"Công văn cần người 5 ký","docType":"Công văn","signerIds":[5]}"""));
        long id = call(created).get("id").asLong();
        mvc.perform(multipart("/api/sign-requests/" + id + "/attachments")
                        .file(new MockMultipartFile("file", "cv.pdf", "application/pdf", pdf.samplePdf("Cong van", 1)))
                        .header("X-User-Id", 4))
                .andExpect(status().isCreated());
        mvc.perform(post("/api/sign-requests/" + id + "/submit").header("X-User-Id", 4)).andExpect(status().isOk());

        mvc.perform(post("/api/sign-requests/" + id + "/sign").header("X-User-Id", 5))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.reason").value("NO_SIGNATURE_IMAGE"));
        mvc.perform(get("/api/sign-requests/" + id).header("X-User-Id", 5))
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.participants[0].status").value("PENDING"))
                .andExpect(jsonPath("$.attachments[0].signed").value(false));
    }

    @Test
    void tuChoi_bat_buoc_lyDo() throws Exception {
        JsonNode list = call(as(4, get("/api/sign-requests").param("scope", "pending")));
        long id = list.get("content").get(0).get("id").asLong();

        mvc.perform(post("/api/sign-requests/" + id + "/reject").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"note\":\"\"}").header("X-User-Id", 4))
                .andExpect(status().isUnprocessableEntity());
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
