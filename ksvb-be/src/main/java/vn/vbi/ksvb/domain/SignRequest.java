package vn.vbi.ksvb.domain;

import jakarta.persistence.CascadeType;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import vn.vbi.ksvb.common.BusinessException;

/**
 * Văn bản trình ký. Toàn bộ luật chuyển trạng thái nằm ở đây (không phụ thuộc Spring) để dễ kiểm thử:
 * <pre>
 * DRAFT --submit--> PENDING --(mọi người đã ký)--> COMPLETED
 * PENDING --reject--> REJECTED      PENDING --cancel--> CANCELLED
 * PENDING --recall--> DRAFT         PENDING --quá hạn--> EXPIRED
 * </pre>
 */
@Entity
@Table(name = "sign_request")
public class SignRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Version
    private long version;

    @Column(length = 40)
    private String code;

    @Column(nullable = false, length = 250)
    private String title;

    @Column(name = "doc_type", nullable = false, length = 60)
    private String docType;

    @Column(name = "unit_name", length = 150)
    private String unitName;

    @Column(length = 500)
    private String description;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "creator_id")
    private AppUser creator;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Priority priority = Priority.NORMAL;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private SignMode mode = SignMode.SEQ;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private DocStatus status = DocStatus.DRAFT;

    @Column(nullable = false)
    private boolean shared;

    private LocalDate deadline;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(length = 500)
    private String message;

    @Column(name = "cancellation_reason", length = 500)
    private String cancellationReason;

    @OneToMany(mappedBy = "request", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("orderNo ASC")
    private List<Participant> participants = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "sign_request_watcher", joinColumns = @JoinColumn(name = "request_id"))
    @Column(name = "user_id")
    private Set<Long> watcherIds = new LinkedHashSet<>();

    @OneToMany(mappedBy = "request", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Attachment> attachments = new ArrayList<>();

    protected SignRequest() {}

    public SignRequest(AppUser creator, String title, String docType, LocalDateTime now) {
        this.creator = Objects.requireNonNull(creator);
        this.title = title;
        this.docType = docType;
        this.unitName = creator.getUnitName();
        this.createdAt = now;
        this.updatedAt = now;
    }

    // ------------------------------------------------------------------ chỉnh sửa (chỉ khi nháp)

    /** Cập nhật thông tin chung. Chỉ người tạo, khi còn là bản nháp. */
    public void edit(Long actorId, String title, String docType, String description, Priority priority, SignMode mode,
                     LocalDate deadline, String message, boolean shared, LocalDateTime now) {
        requireCreator(actorId, "Chỉ người tạo mới được sửa văn bản");
        requireStatus(DocStatus.DRAFT, "Chỉ sửa được văn bản ở trạng thái nháp");
        this.title = title;
        this.docType = docType;
        this.description = description;
        this.priority = priority == null ? Priority.NORMAL : priority;
        this.mode = mode == null ? SignMode.SEQ : mode;
        this.deadline = deadline;
        this.message = message;
        this.shared = shared;
        touch(now);
    }

    /** Thay toàn bộ luồng ký theo đúng thứ tự truyền vào. */
    public void replaceSigners(List<AppUser> signers) {
        requireStatus(DocStatus.DRAFT, "Chỉ sửa được luồng ký khi văn bản là bản nháp");
        if (signers.stream().map(AppUser::getId).distinct().count() != signers.size()) {
            throw BusinessException.badRequest("Một người không được xuất hiện hai lần trong luồng ký");
        }
        participants.clear();
        int order = 1;
        for (AppUser u : signers) {
            participants.add(new Participant(this, u, order++));
        }
    }

    public void replaceWatchers(Set<Long> userIds) {
        watcherIds.clear();
        watcherIds.addAll(userIds);
    }

    public Attachment addAttachment(String originalName, String storedName, long size, boolean signable,
                                    LocalDateTime now) {
        Attachment a = new Attachment(this, originalName, storedName, size, signable, now);
        attachments.add(a);
        return a;
    }

    public void removeAttachment(Long attachmentId) {
        requireStatus(DocStatus.DRAFT, "Chỉ xoá được tệp khi văn bản là bản nháp");
        attachments.removeIf(a -> Objects.equals(a.getId(), attachmentId));
    }

    // ------------------------------------------------------------------ luồng ký

    /** Trình ký: DRAFT → PENDING, kích hoạt người ký đầu tiên (hoặc tất cả nếu ký song song). */
    public void submit(Long actorId, String code, LocalDateTime now) {
        requireCreator(actorId, "Chỉ người tạo mới được trình ký");
        requireStatus(DocStatus.DRAFT, "Chỉ trình ký được văn bản ở trạng thái nháp");
        if (participants.isEmpty()) {
            throw BusinessException.badRequest("Cần ít nhất một người ký");
        }
        if (!hasSignableAttachment()) {
            throw BusinessException.badRequest("Cần ít nhất một tệp PDF cần ký");
        }
        this.code = this.code == null ? code : this.code;
        this.status = DocStatus.PENDING;
        this.submittedAt = now;
        this.completedAt = null;
        participants.forEach(Participant::reset);
        if (mode == SignMode.PAR) {
            participants.forEach(Participant::activate);
        } else {
            participants.get(0).activate();
        }
        touch(now);
    }

    public void sign(Long userId, String note, LocalDateTime now) {
        requireStatus(DocStatus.PENDING, "Văn bản không còn ở trạng thái chờ ký");
        Participant p = participantOf(userId);
        if (p.getStatus() == SignerStatus.WAITING) {
            throw BusinessException.conflict(
                    "Quy trình đang ở bước trước. Hệ thống sẽ thông báo khi đến lượt của bạn.");
        }
        if (p.getStatus() != SignerStatus.PENDING) {
            throw BusinessException.conflict("Bạn đã xử lý văn bản này");
        }
        p.markSigned(note, now);
        if (participants.stream().allMatch(x -> x.getStatus() == SignerStatus.SIGNED)) {
            this.status = DocStatus.COMPLETED;
            this.completedAt = now;
        } else if (mode == SignMode.SEQ) {
            participants.stream().filter(x -> x.getStatus() == SignerStatus.WAITING).findFirst()
                    .ifPresent(Participant::activate);
        }
        touch(now);
    }

    public void reject(Long userId, String reason, LocalDateTime now) {
        requireStatus(DocStatus.PENDING, "Văn bản không còn ở trạng thái chờ ký");
        if (reason == null || reason.isBlank()) {
            throw BusinessException.badRequest("Cần nhập lý do từ chối");
        }
        Participant p = participantOf(userId);
        if (p.getStatus() != SignerStatus.PENDING) {
            throw BusinessException.conflict("Bạn không thể từ chối văn bản này ở thời điểm hiện tại");
        }
        p.markRejected(reason.trim(), now);
        this.status = DocStatus.REJECTED;
        touch(now);
    }

    /** Huỷ: chỉ người tạo, khi đang chờ ký và chưa ai ký/từ chối. */
    public void cancel(Long actorId, String reason, LocalDateTime now) {
        requireCreator(actorId, "Chỉ người tạo mới được huỷ văn bản");
        requireStatus(DocStatus.PENDING, "Văn bản không thể huỷ ở trạng thái hiện tại");
        if (anyoneActed()) {
            throw BusinessException.conflict("Đã có người ký hoặc từ chối nên không thể huỷ");
        }
        if (reason == null || reason.isBlank()) {
            throw BusinessException.badRequest("Cần nhập lý do huỷ");
        }
        this.cancellationReason = reason.trim();
        this.status = DocStatus.CANCELLED;
        touch(now);
    }

    /** Thu hồi về nháp: chỉ người tạo, khi đang chờ ký và chưa ai ký/từ chối. */
    public void recall(Long actorId, LocalDateTime now) {
        requireCreator(actorId, "Chỉ người tạo mới được thu hồi văn bản");
        requireStatus(DocStatus.PENDING, "Chỉ thu hồi được văn bản đang chờ ký");
        if (anyoneActed()) {
            throw BusinessException.conflict("Đã có người ký hoặc từ chối nên không thể thu hồi");
        }
        this.status = DocStatus.DRAFT;
        this.submittedAt = null;
        participants.forEach(Participant::reset);
        touch(now);
    }

    /** Đánh dấu hết hạn nếu quá hạn ký. Trả về true nếu có thay đổi. */
    public boolean expireIfOverdue(LocalDate today, LocalDateTime now) {
        if (status == DocStatus.PENDING && deadline != null && deadline.isBefore(today)) {
            this.status = DocStatus.EXPIRED;
            touch(now);
            return true;
        }
        return false;
    }

    // ------------------------------------------------------------------ truy vấn quyền

    public boolean isPendingFor(Long userId) {
        return status == DocStatus.PENDING && participants.stream()
                .anyMatch(p -> p.getUser().getId().equals(userId) && p.getStatus() == SignerStatus.PENDING);
    }

    public boolean isCreator(Long userId) {
        return creator.getId().equals(userId);
    }

    public boolean isParticipant(Long userId) {
        return participants.stream().anyMatch(p -> p.getUser().getId().equals(userId));
    }

    public boolean canView(AppUser user) {
        return user.can(Permissions.DOCUMENT_VIEW_ALL) || shared || isCreator(user.getId()) || isParticipant(user.getId())
                || watcherIds.contains(user.getId());
    }

    public boolean canDelete(Long userId) {
        return status == DocStatus.DRAFT && isCreator(userId);
    }

    public boolean canCancelOrRecall(Long userId) {
        return status == DocStatus.PENDING && isCreator(userId) && !anyoneActed();
    }

    public long signedCount() {
        return participants.stream().filter(p -> p.getStatus() == SignerStatus.SIGNED).count();
    }

    public boolean hasSignableAttachment() {
        return attachments.stream().anyMatch(Attachment::isSignable);
    }

    // ------------------------------------------------------------------ nội bộ

    private boolean anyoneActed() {
        return participants.stream().anyMatch(p -> p.getStatus() == SignerStatus.SIGNED
                || p.getStatus() == SignerStatus.REJECTED);
    }

    private Participant participantOf(Long userId) {
        return participants.stream().filter(p -> p.getUser().getId().equals(userId)).findFirst()
                .orElseThrow(() -> BusinessException.forbidden("Bạn không có quyền xử lý văn bản này"));
    }

    private void requireCreator(Long actorId, String message) {
        if (!creator.getId().equals(actorId)) {
            throw BusinessException.forbidden(message);
        }
    }

    private void requireStatus(DocStatus expected, String message) {
        if (status != expected) {
            throw BusinessException.conflict(message);
        }
    }

    private void touch(LocalDateTime now) {
        this.updatedAt = now;
    }

    public Long getId() { return id; }
    public String getCode() { return code; }
    public String getTitle() { return title; }
    public String getDocType() { return docType; }
    public String getUnitName() { return unitName; }
    public String getDescription() { return description; }
    public AppUser getCreator() { return creator; }
    public Priority getPriority() { return priority; }
    public SignMode getMode() { return mode; }
    public DocStatus getStatus() { return status; }
    public boolean isShared() { return shared; }
    public LocalDate getDeadline() { return deadline; }
    public LocalDateTime getSubmittedAt() { return submittedAt; }
    public LocalDateTime getCompletedAt() { return completedAt; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public String getMessage() { return message; }
    public String getCancellationReason() { return cancellationReason; }
    public List<Participant> getParticipants() { return participants; }
    public Set<Long> getWatcherIds() { return watcherIds; }
    public List<Attachment> getAttachments() { return attachments; }
}
