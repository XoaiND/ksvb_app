package vn.vbi.ksvb.web;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import vn.vbi.ksvb.domain.AppUser;
import vn.vbi.ksvb.domain.Attachment;
import vn.vbi.ksvb.domain.DocStatus;
import vn.vbi.ksvb.domain.Participant;
import vn.vbi.ksvb.domain.Priority;
import vn.vbi.ksvb.domain.SignMode;
import vn.vbi.ksvb.domain.SignTemplate;
import vn.vbi.ksvb.domain.SignerStatus;
import vn.vbi.ksvb.domain.UserRole;

/** Các DTO của API (request/response), gom một chỗ để dễ tra cứu. */
public final class Dtos {

    private Dtos() {}

    // ------------------------------------------------------------------ response

    public record PersonDto(Long id, String fullName, String email, String unitName, String jobTitle, UserRole role,
                            boolean active) {
        public static PersonDto of(AppUser u) {
            return new PersonDto(u.getId(), u.getFullName(), u.getEmail(), u.getUnitName(), u.getJobTitle(),
                    u.getRole(), u.isActive());
        }
    }

    public record ParticipantDto(Long userId, String fullName, String jobTitle, String unitName, int orderNo,
                                 SignerStatus status, LocalDateTime signedAt, String note) {
        public static ParticipantDto of(Participant p) {
            AppUser u = p.getUser();
            return new ParticipantDto(u.getId(), u.getFullName(), u.getJobTitle(), u.getUnitName(), p.getOrderNo(),
                    p.getStatus(), p.getSignedAt(), p.getNote());
        }
    }

    public record AttachmentDto(Long id, String name, long sizeBytes, boolean signable, LocalDateTime uploadedAt) {
        public static AttachmentDto of(Attachment a) {
            return new AttachmentDto(a.getId(), a.getOriginalName(), a.getSizeBytes(), a.isSignable(),
                    a.getUploadedAt());
        }
    }

    public record SignRequestSummary(Long id, String code, String title, String docType, String unitName,
                                     PersonDto creator, Priority priority, SignMode mode, DocStatus status,
                                     boolean shared, LocalDate deadline, LocalDateTime submittedAt,
                                     long signedCount, int signerCount, boolean canSign) {}

    public record SignRequestDetail(Long id, String code, String title, String docType, String unitName,
                                    String description, String message, String cancellationReason, PersonDto creator,
                                    Priority priority, SignMode mode, DocStatus status, boolean shared,
                                    LocalDate deadline, LocalDateTime submittedAt, LocalDateTime completedAt,
                                    List<ParticipantDto> participants, List<PersonDto> watchers,
                                    List<AttachmentDto> attachments, boolean canSign, boolean canCancel,
                                    boolean canRecall, boolean canDelete, boolean canEdit) {}

    public record TemplateDto(Long id, String name, SignMode mode, int usedCount, List<PersonDto> signers) {
        public static TemplateDto of(SignTemplate t, List<PersonDto> signers) {
            return new TemplateDto(t.getId(), t.getName(), t.getMode(), t.getUsedCount(), signers);
        }
    }

    public record DashboardDto(long pendingForMe, long inProgress, long completed, long rejectedOrCancelled,
                               long mine, long shared, long expired, int year, List<Integer> completedByMonth,
                               List<SignRequestSummary> todo) {}

    public record ReportDto(long total, long completed, long overdue, double onTimeRate, double avgSignHours,
                            Map<String, Long> byUnit, List<SlowSigner> slowestSigners) {}

    public record SlowSigner(String fullName, double avgWaitHours, long overdue) {}

    public record AuditDto(Long id, LocalDateTime at, String actor, String action, String target, String detail) {}

    // ------------------------------------------------------------------ request

    public record SaveSignRequest(
            @NotBlank(message = "Tiêu đề không được để trống") @Size(max = 250, message = "Tiêu đề tối đa 250 ký tự")
            String title,
            @NotBlank(message = "Loại văn bản không được để trống") @Size(max = 60) String docType,
            @Size(max = 500, message = "Mô tả tối đa 500 ký tự") String description,
            Priority priority,
            SignMode mode,
            LocalDate deadline,
            @Size(max = 500, message = "Lời nhắn tối đa 500 ký tự") String message,
            Boolean shared,
            @NotEmpty(message = "Cần ít nhất một người ký") List<Long> signerIds,
            List<Long> watcherIds) {}

    /** Ghi chú khi ký / lý do khi từ chối hoặc huỷ. */
    public record ActionRequest(@Size(max = 500, message = "Tối đa 500 ký tự") String note) {}

    public record SaveTemplate(@NotBlank(message = "Tên mẫu không được để trống") @Size(max = 150) String name,
                               SignMode mode,
                               @NotEmpty(message = "Cần ít nhất một người ký") List<Long> signerIds) {}

    /** Chỉ bật/tắt tài khoản; phân quyền (role) làm ở Keycloak. */
    public record UpdateUser(Boolean active) {}

    /** Người đang đăng nhập + quyền (client role) của lần gọi này — giao diện dùng để ẩn/hiện menu và nút. */
    public record MeDto(Long id, String fullName, String email, String employeeCode, String unitName, String jobTitle,
                        List<String> permissions) {
        public static MeDto of(AppUser u) {
            return new MeDto(u.getId(), u.getFullName(), u.getEmail(), u.getEmployeeCode(), u.getUnitName(),
                    u.getJobTitle(), u.getPermissions().stream().sorted().toList());
        }
    }
}
