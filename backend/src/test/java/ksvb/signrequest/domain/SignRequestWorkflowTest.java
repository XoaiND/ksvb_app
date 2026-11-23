package ksvb.signrequest.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import ksvb.shared.error.BusinessException;
import ksvb.shared.error.ConflictException;
import ksvb.shared.security.Permissions;
import ksvb.user.domain.AppUser;
import ksvb.user.domain.UserRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

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
                .isInstanceOf(ConflictException.class);
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
    void tuanTuTheoBuoc_nguoiCungBuocKyCungLuc_buocSauMoKhiBuocTruocKyHet() {
        AppUser d = user(5L);
        AppUser e = user(6L);
        SignRequest r = new SignRequest(creator, "Theo bước", "Hợp đồng", NOW);
        r.edit(4L, "Theo bước", "Hợp đồng", null, Priority.NORMAL, SignMode.SEQ, null, null, false, NOW);
        r.replaceSigners(List.of(a, b, c, d, e), List.of(1, 1, 2, 2, 3));
        r.addAttachment("hd.pdf", "x.pdf", 10, true, NOW);
        r.submit(4L, "X", NOW);

        assertThat(r.getParticipants()).extracting(Participant::getStepNo).containsExactly(1, 1, 2, 2, 3);
        assertThat(r.getParticipants()).extracting(Participant::getOrderNo).containsExactly(1, 2, 3, 4, 5);
        assertThat(r.isPendingFor(1L)).isTrue();
        assertThat(r.isPendingFor(2L)).isTrue();
        assertThat(r.isPendingFor(3L)).isFalse();

        r.sign(2L, null, NOW);
        assertThat(r.isPendingFor(3L)).isFalse(); // còn người 1 ở bước 1
        r.sign(1L, null, NOW);
        assertThat(r.isPendingFor(3L)).isTrue();
        assertThat(r.isPendingFor(5L)).isTrue();
        assertThat(r.isPendingFor(6L)).isFalse();

        r.sign(3L, null, NOW);
        r.sign(5L, null, NOW);
        assertThat(r.isPendingFor(6L)).isTrue();
        r.sign(6L, null, NOW);
        assertThat(r.getStatus()).isEqualTo(DocStatus.COMPLETED);
    }

    @Test
    void buocKy_khongHopLe_bi422_vaCungMotBuocThiThanhSongSong() {
        SignRequest r = new SignRequest(creator, "Theo bước", "Hợp đồng", NOW);
        r.edit(4L, "Theo bước", "Hợp đồng", null, Priority.NORMAL, SignMode.SEQ, null, null, false, NOW);
        for (List<Integer> bad : List.of(List.of(2, 2), List.of(1, 3), List.of(1, 2, 1), List.of(1))) {
            assertThatThrownBy(() -> r.replaceSigners(List.of(a, b, c).subList(0, Math.max(2, bad.size())), bad))
                    .isInstanceOfSatisfying(BusinessException.class, ex -> assertThat(ex.getCode()).isEqualTo("INVALID_STEPS"));
        }
        r.replaceSigners(List.of(a, b, c), List.of(1, 1, 1));
        assertThat(r.getMode()).isEqualTo(SignMode.PAR);
        assertThat(r.getParticipants()).extracting(Participant::getStepNo).containsOnly(1);

        // song song bỏ qua bước truyền vào; tuần tự không truyền bước = mỗi người một bước
        r.replaceSigners(List.of(a, b), List.of(1, 2));
        assertThat(r.getParticipants()).extracting(Participant::getStepNo).containsExactly(1, 1);
        r.edit(4L, "Theo bước", "Hợp đồng", null, Priority.NORMAL, SignMode.SEQ, null, null, false, NOW);
        r.replaceSigners(List.of(a, b, c));
        assertThat(r.getParticipants()).extracting(Participant::getStepNo).containsExactly(1, 2, 3);
    }

    @Test
    void khongKyHaiLan_vaNguoiNgoaiLuongBiTuChoiQuyen() {
        SignRequest r = draft(SignMode.PAR, a, b);
        r.submit(4L, "X", NOW);
        r.sign(1L, null, NOW);

        assertThatThrownBy(() -> r.sign(1L, null, NOW))
                .isInstanceOf(ConflictException.class);
        assertThatThrownBy(() -> r.sign(99L, null, NOW))
                .isInstanceOfSatisfying(BusinessException.class, e -> assertThat(e.getCode()).startsWith("NOT_"));
    }

    @Test
    void tuChoi_canLyDo_vaDungLuong() {
        SignRequest r = draft(SignMode.SEQ, a, b);
        r.submit(4L, "X", NOW);

        assertThatThrownBy(() -> r.reject(1L, "  ", NOW))
                .isInstanceOf(BusinessException.class);

        r.reject(1L, "Thiếu phụ lục", NOW);
        assertThat(r.getStatus()).isEqualTo(DocStatus.REJECTED);
        assertThatThrownBy(() -> r.sign(2L, null, NOW)).isInstanceOf(ConflictException.class);
    }

    @Test
    void huy_chiNguoiTao_khiChuaAiKy() {
        SignRequest r = draft(SignMode.SEQ, a, b);
        r.submit(4L, "X", NOW);

        assertThatThrownBy(() -> r.cancel(1L, "lý do", NOW))
                .isInstanceOfSatisfying(BusinessException.class, e -> assertThat(e.getCode()).startsWith("NOT_"));
        assertThatThrownBy(() -> r.cancel(4L, "", NOW))
                .isInstanceOf(BusinessException.class);

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
                .isInstanceOf(ConflictException.class);
        assertThatThrownBy(() -> r.recall(4L, NOW))
                .isInstanceOf(ConflictException.class);
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
                .isInstanceOf(BusinessException.class);

        SignRequest noFile = new SignRequest(creator, "T", "Hợp đồng", NOW);
        noFile.replaceSigners(List.of(a));
        assertThatThrownBy(() -> noFile.submit(4L, "X", NOW))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    void chiNguoiTaoMoiTrinhKyVaSuaDuoc_vaChiKhiLaNhap() {
        SignRequest r = draft(SignMode.SEQ, a);
        assertThatThrownBy(() -> r.submit(1L, "X", NOW))
                .isInstanceOfSatisfying(BusinessException.class, e -> assertThat(e.getCode()).startsWith("NOT_"));

        r.submit(4L, "X", NOW);
        assertThatThrownBy(() -> r.edit(4L, "Đổi", "Hợp đồng", null, Priority.NORMAL, SignMode.SEQ, null, null,
                false, NOW)).isInstanceOf(ConflictException.class);
        assertThatThrownBy(() -> r.replaceSigners(List.of(b))).isInstanceOf(ConflictException.class);
    }

    @Test
    void luongKyKhongChoPhepTrungNguoi() {
        SignRequest r = new SignRequest(creator, "T", "Hợp đồng", NOW);
        assertThatThrownBy(() -> r.replaceSigners(List.of(a, a)))
                .isInstanceOf(BusinessException.class);
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
