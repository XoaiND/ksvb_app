package ksvb.signrequest.application;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import ksvb.shared.audit.AuditService;
import ksvb.shared.error.BusinessException;
import ksvb.shared.error.ConflictException;
import ksvb.shared.error.NotFoundException;
import ksvb.shared.outbox.OutboxService;
import ksvb.shared.paging.PageResponse;
import ksvb.signrequest.domain.DocStatus;
import ksvb.signrequest.domain.NotificationService;
import ksvb.signrequest.domain.SignRequest;
import ksvb.signrequest.infra.DocNumberGenerator;
import ksvb.signrequest.infra.SignRequestRepository;
import ksvb.signrequest.infra.SignRequestSpecs;
import ksvb.signrequest.infra.SignRequestSpecs.Scope;
import ksvb.user.application.PersonDto;
import ksvb.user.domain.AppUser;
import ksvb.user.infra.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SignRequestService {

    private static final int MAX_PAGE_SIZE = 100;

    private static final Logger log = LoggerFactory.getLogger(SignRequestService.class);

    private final SignRequestRepository requests;
    private final UserRepository users;
    private final DocNumberGenerator numbers;
    private final AuditService audit;
    private final NotificationService notifier;
    private final OutboxService outbox;

    public SignRequestService(SignRequestRepository requests, UserRepository users, DocNumberGenerator numbers,
                              AuditService audit, NotificationService notifier, OutboxService outbox) {
        this.requests = requests;
        this.users = users;
        this.numbers = numbers;
        this.audit = audit;
        this.notifier = notifier;
        this.outbox = outbox;
    }

    // ------------------------------------------------------------------ truy vấn

    @Transactional(readOnly = true)
    public PageResponse<SignRequestSummary> search(AppUser me, String scope, String q, String docType, String unit,
                                           DocStatus status, int page, int size) {
        Scope s = parseScope(scope);
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), MAX_PAGE_SIZE),
                Sort.by(Sort.Direction.DESC, "createdAt", "id"));
        Specification<SignRequest> spec = SignRequestSpecs.scope(s, me.getId())
                .and(SignRequestSpecs.filter(q, docType, unit, status));
        return PageResponse.of(requests.findAll(spec, pageable).map(r -> toSummary(r, me)));
    }

    @Transactional(readOnly = true)
    public SignRequestDetail get(AppUser me, Long id) {
        return toDetail(load(me, id), me);
    }

    // ------------------------------------------------------------------ soạn thảo

    @Transactional
    public SignRequestDetail create(AppUser me, SaveSignRequest in) {
        LocalDateTime now = LocalDateTime.now();
        SignRequest r = new SignRequest(me, in.title().trim(), in.docType().trim(), now);
        applyEdit(me, r, in, now);
        requests.save(r);
        audit.log("CREATE", "SignRequest#" + r.getId(), r.getTitle());
        return toDetail(r, me);
    }

    @Transactional
    public SignRequestDetail update(AppUser me, Long id, SaveSignRequest in) {
        SignRequest r = find(id);
        if (in.versionNo() == null || !in.versionNo().equals(r.getVersionNo())) {
            throw new ConflictException("CONCURRENT_UPDATE", "Văn bản đã bị người khác thay đổi, vui lòng tải lại", null);
        }
        applyEdit(me, r, in, LocalDateTime.now());
        requests.saveAndFlush(r); // để versionNo trả về là bản mới
        audit.log("UPDATE", "SignRequest#" + id, r.getTitle());
        return toDetail(r, me);
    }

    @Transactional
    public void delete(AppUser me, Long id) {
        SignRequest r = find(id);
        if (!r.canDelete(me.getId())) {
            throw new ConflictException("CANNOT_DELETE", "Chỉ người tạo mới xoá được bản nháp", null);
        }
        requests.delete(r);
        audit.log("DELETE", "SignRequest#" + id, r.getTitle());
    }

    private void applyEdit(AppUser me, SignRequest r, SaveSignRequest in, LocalDateTime now) {
        requireCreator(me, r, "Chỉ người tạo mới được sửa văn bản");
        r.edit(me.getId(), in.title().trim(), in.docType().trim(), in.description(), in.priority(), in.mode(),
                in.deadline(), in.message(), Boolean.TRUE.equals(in.shared()), now);
        r.replaceSigners(resolveUsers(in.signerIds(), "người ký"));
        Set<Long> watchers = new LinkedHashSet<>(in.watcherIds() == null ? List.of() : in.watcherIds());
        if (!watchers.isEmpty()) {
            resolveUsers(new ArrayList<>(watchers), "người theo dõi");
        }
        r.replaceWatchers(watchers);
    }

    // ------------------------------------------------------------------ luồng ký

    @Transactional
    public SignRequestDetail submit(AppUser me, Long id) {
        SignRequest r = find(id);
        LocalDateTime now = LocalDateTime.now();
        requireCreator(me, r, "Chỉ người tạo mới được trình ký");
        r.submit(me.getId(), r.getCode() == null ? numbers.next(r.getDocType(), now.toLocalDate()) : null, now);
        audit.log("SUBMIT", codeOf(r), r.getTitle());
        event(r, SignRequestEvents.SUBMITTED, me.getId());
        safeNotify(() -> notifier.notifyTurn(r));
        return toDetail(r, me);
    }

    @Transactional
    public SignRequestDetail sign(AppUser me, Long id, String note) {
        SignRequest r = find(id);
        requireParticipant(me, r);
        r.sign(me.getId(), note, LocalDateTime.now());
        audit.log("SIGN", codeOf(r), r.getTitle());
        event(r, SignRequestEvents.SIGNED, me.getId());
        if (r.getStatus() == DocStatus.COMPLETED) {
            event(r, SignRequestEvents.COMPLETED, me.getId());
        }
        safeNotify(() -> {
            if (r.getStatus() == DocStatus.COMPLETED) notifier.notifyStatusChanged(r);
            else notifier.notifyTurn(r);
        });
        return toDetail(r, me);
    }

    @Transactional
    public SignRequestDetail reject(AppUser me, Long id, String reason) {
        SignRequest r = find(id);
        requireParticipant(me, r);
        r.reject(me.getId(), reason, LocalDateTime.now());
        audit.log("REJECT", codeOf(r), reason);
        event(r, SignRequestEvents.REJECTED, me.getId());
        safeNotify(() -> notifier.notifyStatusChanged(r));
        return toDetail(r, me);
    }

    @Transactional
    public SignRequestDetail cancel(AppUser me, Long id, String reason) {
        SignRequest r = find(id);
        requireCreator(me, r, "Chỉ người tạo mới được huỷ văn bản");
        r.cancel(me.getId(), reason, LocalDateTime.now());
        audit.log("CANCEL", codeOf(r), reason);
        event(r, SignRequestEvents.CANCELLED, me.getId());
        safeNotify(() -> notifier.notifyStatusChanged(r));
        return toDetail(r, me);
    }

    @Transactional
    public SignRequestDetail recall(AppUser me, Long id) {
        SignRequest r = find(id);
        requireCreator(me, r, "Chỉ người tạo mới được thu hồi văn bản");
        r.recall(me.getId(), LocalDateTime.now());
        audit.log("RECALL", codeOf(r), r.getTitle());
        event(r, SignRequestEvents.RECALLED, me.getId());
        return toDetail(r, me);
    }

    @Transactional
    public void remind(AppUser me, Long id) {
        SignRequest r = find(id);
        if (!r.isCreator(me.getId())) {
            throw new AccessDeniedException("Chỉ người tạo mới được nhắc ký");
        }
        if (r.getStatus() != DocStatus.PENDING) {
            throw new ConflictException("NOT_PENDING", "Chỉ nhắc ký được văn bản đang chờ ký", null);
        }
        safeNotify(() -> notifier.remind(r));
        audit.log("REMIND", codeOf(r), null);
    }

    /** Chạy hằng ngày: chuyển các văn bản quá hạn sang EXPIRED. Trả về số văn bản đã chuyển. */
    @Transactional
    public int expireOverdue() {
        LocalDate today = LocalDate.now();
        LocalDateTime now = LocalDateTime.now();
        int n = 0;
        for (SignRequest r : requests.findByStatusAndDeadlineBefore(DocStatus.PENDING, today)) {
            if (r.expireIfOverdue(today, now)) {
                n++;
                audit.log("EXPIRE", codeOf(r), r.getTitle());
                event(r, SignRequestEvents.EXPIRED, null);
                safeNotify(() -> notifier.notifyStatusChanged(r));
            }
        }
        return n;
    }

    // ------------------------------------------------------------------ số hiệu


    // ------------------------------------------------------------------ nội bộ & ánh xạ

    private SignRequest find(Long id) {
        return requests.findById(id).orElseThrow(() -> new NotFoundException("Văn bản", id));
    }

    private SignRequest load(AppUser me, Long id) {
        SignRequest r = find(id);
        if (!r.canView(me)) {
            throw new AccessDeniedException("Bạn không có quyền xem văn bản này");
        }
        return r;
    }

    private List<AppUser> resolveUsers(List<Long> ids, String what) {
        Map<Long, AppUser> byId = users.findAllById(ids).stream()
                .collect(Collectors.toMap(AppUser::getId, Function.identity()));
        List<AppUser> out = new ArrayList<>();
        for (Long id : ids) {
            AppUser u = byId.get(id);
            if (u == null || !u.isActive()) {
                throw new BusinessException("UNKNOWN_USER", "Không tìm thấy " + what + " có id " + id);
            }
            out.add(u);
        }
        return out;
    }

    private static Scope parseScope(String s) {
        try {
            return Scope.valueOf(s == null ? "PENDING" : s.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BusinessException("INVALID_SCOPE", "scope phải là pending, mine, shared hoặc watching");
        }
    }

    /** Sự kiện đổi trạng thái ra outbox (cùng transaction). Payload chỉ có thông tin nhận diện, không có nội dung tệp. */
    private void event(SignRequest r, String type, Long actorId) {
        Map<String, Object> p = new LinkedHashMap<>();
        p.put("id", r.getId());
        p.put("code", r.getCode());
        p.put("title", r.getTitle());
        p.put("docType", r.getDocType());
        p.put("status", r.getStatus().name());
        p.put("creatorId", r.getCreator().getId());
        p.put("actorId", actorId);
        // khoá của KSVB là bigint: aggregate_id uuid = (0, id), số hiệu đọc được ở aggregate_code
        outbox.publish(SignRequestEvents.AGGREGATE, new UUID(0L, r.getId()), r.getCode(), type, r.getVersionNo(), p, null);
    }

    private static String codeOf(SignRequest r) {
        return r.getCode() != null ? r.getCode() : "SignRequest#" + r.getId();
    }

    private void safeNotify(Runnable action) {
        try {
            action.run();
        } catch (RuntimeException e) {
            log.warn("Gửi thông báo thất bại (bỏ qua): {}", e.getMessage());
        }
    }

    private SignRequestSummary toSummary(SignRequest r, AppUser me) {
        return new SignRequestSummary(r.getId(), r.getCode(), r.getTitle(), r.getDocType(), r.getUnitName(),
                PersonDto.of(r.getCreator()), r.getPriority(), r.getMode(), r.getStatus(), r.isShared(),
                r.getDeadline(), r.getSubmittedAt(), r.signedCount(), r.getParticipants().size(),
                r.isPendingFor(me.getId()));
    }

    private SignRequestDetail toDetail(SignRequest r, AppUser me) {
        List<PersonDto> watchers = r.getWatcherIds().isEmpty() ? List.of()
                : users.findAllById(r.getWatcherIds()).stream().map(PersonDto::of).toList();
        boolean draft = r.getStatus() == DocStatus.DRAFT;
        boolean creator = r.isCreator(me.getId());
        return new SignRequestDetail(r.getId(), r.getCode(), r.getTitle(), r.getDocType(), r.getUnitName(),
                r.getDescription(), r.getMessage(), r.getCancellationReason(), PersonDto.of(r.getCreator()),
                r.getPriority(), r.getMode(), r.getStatus(), r.isShared(), r.getDeadline(), r.getSubmittedAt(),
                r.getCompletedAt(),
                r.getParticipants().stream().map(ParticipantDto::of).toList(), watchers,
                r.getAttachments().stream().map(AttachmentDto::of).toList(),
                r.isPendingFor(me.getId()), r.canCancelOrRecall(me.getId()), r.canCancelOrRecall(me.getId()),
                r.canDelete(me.getId()), draft && creator, r.getVersionNo());
    }

    /** Quyền trên văn bản (403): kiểm ở service; luật domain vẫn chặn lại (422) nếu bị gọi sai. */
    private static void requireCreator(AppUser me, SignRequest r, String message) {
        if (!r.isCreator(me.getId())) {
            throw new AccessDeniedException(message);
        }
    }

    private static void requireParticipant(AppUser me, SignRequest r) {
        if (!r.isParticipant(me.getId())) {
            throw new AccessDeniedException("Bạn không có quyền xử lý văn bản này");
        }
    }
}
