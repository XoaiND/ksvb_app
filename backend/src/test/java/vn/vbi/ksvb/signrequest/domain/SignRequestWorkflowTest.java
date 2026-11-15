package vn.vbi.ksvb.signrequest.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import vn.vbi.ksvb.shared.error.BusinessException;
import vn.vbi.ksvb.shared.security.Permissions;
import vn.vbi.ksvb.user.domain.AppUser;
import vn.vbi.ksvb.user.domain.UserRole;

class SignRequestWorkflowTest {

    private static final LocalDateTime NOW = LocalDateTime.of(2026, 10, 31, 10, 0);

    private AppUser creator;
    private AppUser a;
    private AppUser b;
    private AppUser c;

    @BeforeEach
    void setUp() {
        creator = user(4L);
        a = user(1L);
        b = user(2L);
        c = user(3L);
    }

    private static AppUser user(long id) {
        return AppUser.of(id, "Người " + id, "u" + id + "@x.vn", "Phòng", "Chuyên viên", UserRole.USER);
    }

    private SignRequest draft(SignMode mode, AppUser... signers) {
        SignRequest r = new SignRequest(creator, "Hợp đồng thử", "Hợp đồng", NOW);
        r.edit(creator.getId(), "Hợp đồng thử", "Hợp đồng", null, Priority.NORMAL, mode, LocalDate.of(2026, 11, 5),
                null, false, NOW);
        r.replaceSigners(List.of(signers));
        r.addAttachment("hd.pdf", "x.pdf", 10, true, NOW);
        return r;
    }

    private static void assertStatus(BusinessException e, HttpStatus status) {
        assertThat(e.getStatus()).isEqualTo(status.value());
    }

    @Test
    void tuanTu_chiNguoiDauDuocKichHoat_vaChuyenLuotKhiKy() {
        SignRequest r = draft(SignMode.SEQ, a, b, c);
        r.submit(4L, "HD-2026-0001", NOW);

        assertThat(r.getStatus()).isEqualTo(DocStatus.PENDING);
        assertThat(r.getCode()).isEqualTo("HD-2026-0001");
        assertThat(r.isPendingFor(1L)).isTrue();
        assertThat(r.isPendingFor(2L)).isFalse();

        r.sign(1L, "ok", NOW);
        assertThat(r.isPendingFor(2L)).isTrue();
        assertThat(r.isPendingFor(3L)).isFalse();

        r.sign(2L, null, NOW);
        r.sign(3L, null, NOW);
        assertThat(r.getStatus()).isEqualTo(DocStatus.COMPLETED);
        assertThat(r.getCompletedAt()).isEqualTo(NOW);
        assertThat(r.signedCount()).isEqualTo(3);
    }

    @Test
    void tuanTu_kyKhongDenLuotBiTuChoi() {
        SignRequest r = draft(SignMode.SEQ, a, b);
        r.submit(4L, "X", NOW);

        assertThatThrownBy(() -> r.sign(2L, null, NOW))
                .isInstanceOfSatisfying(BusinessException.class, e -> assertStatus(e, HttpStatus.CONFLICT));
    }

    @Test
    void songSong_moiNguoiKyCungLuc_vaHoanThanhKhiDuNguoi() {
        SignRequest r = draft(SignMode.PAR, a, b);
        r.submit(4L, "X", NOW);

        assertThat(r.isPendingFor(1L)).isTrue();
        assertThat(r.isPendingFor(2L)).isTrue();

        r.sign(2L, null, NOW);
        assertThat(r.getStatus()).isEqualTo(DocStatus.PENDING);
        r.sign(1L, null, NOW);
        assertThat(r.getStatus()).isEqualTo(DocStatus.COMPLETED);
    }

    @Test
    void khongKyHaiLan_vaNguoiNgoaiLuongBiTuChoiQuyen() {
        SignRequest r = draft(SignMode.PAR, a, b);
        r.submit(4L, "X", NOW);
        r.sign(1L, null, NOW);

        assertThatThrownBy(() -> r.sign(1L, null, NOW))
                .isInstanceOfSatisfying(BusinessException.class, e -> assertStatus(e, HttpStatus.CONFLICT));
        assertThatThrownBy(() -> r.sign(99L, null, NOW))
                .isInstanceOfSatisfying(BusinessException.class, e -> assertStatus(e, HttpStatus.FORBIDDEN));
    }

    @Test
    void tuChoi_canLyDo_vaDungLuong() {
        SignRequest r = draft(SignMode.SEQ, a, b);
        r.submit(4L, "X", NOW);

        assertThatThrownBy(() -> r.reject(1L, "  ", NOW))
                .isInstanceOfSatisfying(BusinessException.class, e -> assertStatus(e, HttpStatus.UNPROCESSABLE_ENTITY));

        r.reject(1L, "Thiếu phụ lục", NOW);
        assertThat(r.getStatus()).isEqualTo(DocStatus.REJECTED);
        assertThatThrownBy(() -> r.sign(2L, null, NOW)).isInstanceOf(BusinessException.class);
    }

    @Test
    void huy_chiNguoiTao_khiChuaAiKy() {
        SignRequest r = draft(SignMode.SEQ, a, b);
        r.submit(4L, "X", NOW);

        assertThatThrownBy(() -> r.cancel(1L, "lý do", NOW))
                .isInstanceOfSatisfying(BusinessException.class, e -> assertStatus(e, HttpStatus.FORBIDDEN));
        assertThatThrownBy(() -> r.cancel(4L, "", NOW))
                .isInstanceOfSatisfying(BusinessException.class, e -> assertStatus(e, HttpStatus.UNPROCESSABLE_ENTITY));

        r.cancel(4L, "Nộp nhầm", NOW);
        assertThat(r.getStatus()).isEqualTo(DocStatus.CANCELLED);
        assertThat(r.getCancellationReason()).isEqualTo("Nộp nhầm");
    }

    @Test
    void huyVaThuHoi_biChanKhiDaCoNguoiKy() {
        SignRequest r = draft(SignMode.PAR, a, b);
        r.submit(4L, "X", NOW);
        r.sign(1L, null, NOW);

        assertThat(r.canCancelOrRecall(4L)).isFalse();
        assertThatThrownBy(() -> r.cancel(4L, "x", NOW))
                .isInstanceOfSatisfying(BusinessException.class, e -> assertStatus(e, HttpStatus.CONFLICT));
        assertThatThrownBy(() -> r.recall(4L, NOW))
                .isInstanceOfSatisfying(BusinessException.class, e -> assertStatus(e, HttpStatus.CONFLICT));
    }

    @Test
    void thuHoi_veNhap_roiTrinhLaiGiuNguyenSoHieu() {
        SignRequest r = draft(SignMode.SEQ, a, b);
        r.submit(4L, "HD-2026-0007", NOW);

        r.recall(4L, NOW);
        assertThat(r.getStatus()).isEqualTo(DocStatus.DRAFT);
        assertThat(r.getSubmittedAt()).isNull();
        assertThat(r.getParticipants()).allMatch(p -> p.getStatus() == SignerStatus.WAITING);

        r.submit(4L, "HD-2026-0099", NOW.plusDays(1));
        assertThat(r.getCode()).isEqualTo("HD-2026-0007");
        assertThat(r.isPendingFor(1L)).isTrue();
    }

    @Test
    void trinhKy_canNguoiKyVaTepPdf() {
        SignRequest empty = new SignRequest(creator, "T", "Hợp đồng", NOW);
        assertThatThrownBy(() -> empty.submit(4L, "X", NOW))
                .isInstanceOfSatisfying(BusinessException.class, e -> assertStatus(e, HttpStatus.UNPROCESSABLE_ENTITY));

        SignRequest noFile = new SignRequest(creator, "T", "Hợp đồng", NOW);
        noFile.replaceSigners(List.of(a));
        assertThatThrownBy(() -> noFile.submit(4L, "X", NOW))
                .isInstanceOfSatisfying(BusinessException.class, e -> assertStatus(e, HttpStatus.UNPROCESSABLE_ENTITY));
    }

    @Test
    void chiNguoiTaoMoiTrinhKyVaSuaDuoc_vaChiKhiLaNhap() {
        SignRequest r = draft(SignMode.SEQ, a);
        assertThatThrownBy(() -> r.submit(1L, "X", NOW))
                .isInstanceOfSatisfying(BusinessException.class, e -> assertStatus(e, HttpStatus.FORBIDDEN));

        r.submit(4L, "X", NOW);
        assertThatThrownBy(() -> r.edit(4L, "Đổi", "Hợp đồng", null, Priority.NORMAL, SignMode.SEQ, null, null,
                false, NOW)).isInstanceOfSatisfying(BusinessException.class, e -> assertStatus(e, HttpStatus.CONFLICT));
        assertThatThrownBy(() -> r.replaceSigners(List.of(b))).isInstanceOf(BusinessException.class);
    }

    @Test
    void luongKyKhongChoPhepTrungNguoi() {
        SignRequest r = new SignRequest(creator, "T", "Hợp đồng", NOW);
        assertThatThrownBy(() -> r.replaceSigners(List.of(a, a)))
                .isInstanceOfSatisfying(BusinessException.class, e -> assertStatus(e, HttpStatus.UNPROCESSABLE_ENTITY));
    }

    @Test
    void hetHan_chiVoiVanBanChoKyQuaHan() {
        SignRequest r = draft(SignMode.SEQ, a);
        assertThat(r.expireIfOverdue(LocalDate.of(2026, 12, 1), NOW)).isFalse(); // còn là nháp

        r.submit(4L, "X", NOW);
        assertThat(r.expireIfOverdue(LocalDate.of(2026, 11, 5), NOW)).isFalse(); // đúng hạn chưa quá
        assertThat(r.expireIfOverdue(LocalDate.of(2026, 11, 6), NOW)).isTrue();
        assertThat(r.getStatus()).isEqualTo(DocStatus.EXPIRED);
    }

    @Test
    void quyenXem_nguoiNgoaiKhongThayTruTaiLieuChungHoacQuanTri() {
        SignRequest r = draft(SignMode.SEQ, a);
        r.replaceWatchers(java.util.Set.of(10L));
        AppUser outsider = user(50L);
        AppUser admin = AppUser.of(51L, "Admin", "a@x.vn", "IT", "QT", UserRole.USER)
                .withPermissions(List.of(Permissions.DOCUMENT_VIEW_ALL));

        assertThat(r.canView(creator)).isTrue();
        assertThat(r.canView(a)).isTrue();
        assertThat(r.canView(user(10L))).isTrue();
        assertThat(r.canView(outsider)).isFalse();
        assertThat(r.canView(admin)).isTrue();
    }
}
