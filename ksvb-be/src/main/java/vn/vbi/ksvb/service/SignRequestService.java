package vn.vbi.ksvb.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.vbi.ksvb.common.BusinessException;
import vn.vbi.ksvb.domain.AppUser;
import vn.vbi.ksvb.domain.DocCounter;
import vn.vbi.ksvb.domain.DocStatus;
import vn.vbi.ksvb.domain.SignRequest;
import vn.vbi.ksvb.repo.DocCounterRepository;
import vn.vbi.ksvb.repo.SignRequestRepository;
import vn.vbi.ksvb.repo.UserRepository;
import vn.vbi.ksvb.service.SignRequestSpecs.Scope;
import vn.vbi.ksvb.web.Dtos.ParticipantDto;
import vn.vbi.ksvb.web.Dtos.PersonDto;
import vn.vbi.ksvb.web.Dtos.SaveSignRequest;
import vn.vbi.ksvb.web.Dtos.SignRequestDetail;
import vn.vbi.ksvb.web.Dtos.SignRequestSummary;
import vn.vbi.ksvb.web.Dtos.AttachmentDto;

@Service
public class SignRequestService {

    private static final Logger log = LoggerFactory.getLogger(SignRequestService.class);

    private static final Map<String, String> CODE_PREFIX = Map.of(
            "Hợp đồng", "HD", "Quyết định", "QD", "Tờ trình", "TT",
            "Báo giá", "BG", "Biên bản", "BB", "Công văn", "CV");

    private final SignRequestRepository requests;
    private final UserRepository users;
    private final DocCounterRepository counters;
    private final AuditService audit;
    private final NotificationService notifier;

    public SignRequestService(SignRequestRepository requests, UserRepository users, DocCounterRepository counters,
                              AuditService audit, NotificationService notifier) {
        this.requests = requests;
        this.users = users;
        this.counters = counters;
        this.audit = audit;
        this.notifier = notifier;
    }

    // ------------------------------------------------------------------ truy vấn

    @Transactional(readOnly = true)
    public Page<SignRequestSummary> search(AppUser me, String scope, String q, String docType, String unit,
                                           DocStatus status, int page, int size) {
        Scope s = parseScope(scope);
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100),
                Sort.by(Sort.Direction.DESC, "createdAt"));
        Specification<SignRequest> spec = SignRequestSpecs.scope(s, me.getId())
                .and(SignRequestSpecs.filter(q, docType, unit, status));
        return requests.findAll(spec, pageable).map(r -> toSummary(r, me));
    }

    @Transactional(readOnly = true)
    public SignRequestDetail get(AppUser me, Long id) {
        return toDetail(load(me, id), me);
    }

    /** Dùng cho tải tệp: kiểm tra quyền xem rồi trả entity. */
    @Transactional(readOnly = true)
    public SignRequest loadViewable(AppUser me, Long id) {
        return load(me, id);
    }

    // ------------------------------------------------------------------ soạn thảo

    @Transactional
    public SignRequestDetail create(AppUser me, SaveSignRequest in) {
        LocalDateTime now = LocalDateTime.now();
        SignRequest r = new SignRequest(me, in.title().trim(), in.docType().trim(), now);
        applyEdit(me, r, in, now);
        requests.save(r);
        audit.log(me.getId(), "CREATE", "SignRequest#" + r.getId(), r.getTitle());
        return toDetail(r, me);
    }

    @Transactional
    public SignRequestDetail update(AppUser me, Long id, SaveSignRequest in) {
        SignRequest r = find(id);
        applyEdit(me, r, in, LocalDateTime.now());
        audit.log(me.getId(), "UPDATE", "SignRequest#" + id, r.getTitle());
        return toDetail(r, me);
    }

    @Transactional
    public void delete(AppUser me, Long id) {
        SignRequest r = find(id);
        if (!r.canDelete(me.getId())) {
            throw BusinessException.conflict("Chỉ người tạo mới xoá được bản nháp");
        }
        requests.delete(r);
        audit.log(me.getId(), "DELETE", "SignRequest#" + id, r.getTitle());
    }

    private void applyEdit(AppUser me, SignRequest r, SaveSignRequest in, LocalDateTime now) {
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
        r.submit(me.getId(), r.getCode() == null ? nextCode(r.getDocType(), now.toLocalDate()) : null, now);
        audit.log(me.getId(), "SUBMIT", codeOf(r), r.getTitle());
        safeNotify(() -> notifier.notifyTurn(r));
        return toDetail(r, me);
    }

    @Transactional
    public SignRequestDetail sign(AppUser me, Long id, String note) {
        SignRequest r = find(id);
        r.sign(me.getId(), note, LocalDateTime.now());
        audit.log(me.getId(), "SIGN", codeOf(r), r.getTitle());
        safeNotify(() -> {
            if (r.getStatus() == DocStatus.COMPLETED) notifier.notifyStatusChanged(r);
            else notifier.notifyTurn(r);
        });
        return toDetail(r, me);
    }

    @Transactional
    public SignRequestDetail reject(AppUser me, Long id, String reason) {
        SignRequest r = find(id);
        r.reject(me.getId(), reason, LocalDateTime.now());
        audit.log(me.getId(), "REJECT", codeOf(r), reason);
        safeNotify(() -> notifier.notifyStatusChanged(r));
        return toDetail(r, me);
    }

    @Transactional
    public SignRequestDetail cancel(AppUser me, Long id, String reason) {
        SignRequest r = find(id);
        r.cancel(me.getId(), reason, LocalDateTime.now());
        audit.log(me.getId(), "CANCEL", codeOf(r), reason);
        safeNotify(() -> notifier.notifyStatusChanged(r));
        return toDetail(r, me);
    }

    @Transactional
    public SignRequestDetail recall(AppUser me, Long id) {
        SignRequest r = find(id);
        r.recall(me.getId(), LocalDateTime.now());
        audit.log(me.getId(), "RECALL", codeOf(r), r.getTitle());
        return toDetail(r, me);
    }

    @Transactional
    public void remind(AppUser me, Long id) {
        SignRequest r = find(id);
        if (!r.isCreator(me.getId())) {
            throw BusinessException.forbidden("Chỉ người tạo mới được nhắc ký");
        }
        if (r.getStatus() != DocStatus.PENDING) {
            throw BusinessException.conflict("Chỉ nhắc ký được văn bản đang chờ ký");
        }
        safeNotify(() -> notifier.remind(r));
        audit.log(me.getId(), "REMIND", codeOf(r), null);
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
                audit.log(null, "EXPIRE", codeOf(r), r.getTitle());
                safeNotify(() -> notifier.notifyStatusChanged(r));
            }
        }
        return n;
    }

    // ------------------------------------------------------------------ số hiệu

    /** Sinh số hiệu dạng HD-2026-0143; khoá ghi bộ đếm để hai lần trình đồng thời không trùng số. */
    String nextCode(String docType, LocalDate today) {
        String prefix = CODE_PREFIX.getOrDefault(docType, "VB");
        String key = prefix + "-" + today.getYear();
        DocCounter c = counters.findForUpdate(key).orElseGet(() -> counters.saveAndFlush(new DocCounter(key)));
        int n = c.next();
        counters.save(c);
        return String.format("%s-%04d", key, n);
    }

    // ------------------------------------------------------------------ nội bộ & ánh xạ

    private SignRequest find(Long id) {
        return requests.findById(id).orElseThrow(() -> BusinessException.notFound("Không tìm thấy văn bản"));
    }

    private SignRequest load(AppUser me, Long id) {
        SignRequest r = find(id);
        if (!r.canView(me)) {
            throw BusinessException.forbidden("Bạn không có quyền xem văn bản này");
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
                throw BusinessException.badRequest("Không tìm thấy " + what + " có id " + id);
            }
            out.add(u);
        }
        return out;
    }

    private static Scope parseScope(String s) {
        try {
            return Scope.valueOf(s == null ? "PENDING" : s.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw BusinessException.badRequest("scope phải là pending, mine, shared hoặc watching");
        }
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
                r.canDelete(me.getId()), draft && creator);
    }
}
