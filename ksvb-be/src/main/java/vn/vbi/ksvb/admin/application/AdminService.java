package vn.vbi.ksvb.admin.application;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.vbi.ksvb.shared.audit.AuditLog;
import vn.vbi.ksvb.shared.audit.AuditLogRepository;
import vn.vbi.ksvb.shared.audit.AuditService;
import vn.vbi.ksvb.shared.error.BusinessException;
import vn.vbi.ksvb.shared.paging.PageResponse;
import vn.vbi.ksvb.user.application.PersonDto;
import vn.vbi.ksvb.user.domain.AppUser;
import vn.vbi.ksvb.user.infra.UserRepository;

@Service
public class AdminService {

    private final UserRepository users;
    private final AuditLogRepository audits;
    private final AuditService audit;

    public AdminService(UserRepository users, AuditLogRepository audits, AuditService audit) {
        this.users = users;
        this.audits = audits;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public List<PersonDto> listUsers() {
        return users.findAll(Sort.by("fullName")).stream().map(PersonDto::of).toList();
    }

    @Transactional
    public PersonDto updateUser(AppUser admin, Long id, UpdateUser in) {
        AppUser u = users.findById(id).orElseThrow(() -> BusinessException.notFound("Không tìm thấy người dùng"));
        if (u.getId().equals(admin.getId()) && Boolean.FALSE.equals(in.active())) {
            throw BusinessException.conflict("Không thể tự vô hiệu hoá chính mình");
        }
        if (in.active() != null) u.setActive(in.active());
        audit.log(admin.getId(), "UPDATE_USER", "User#" + id, "active=" + u.isActive());
        return PersonDto.of(u);
    }

    @Transactional(readOnly = true)
    public PageResponse<AuditDto> auditLogs(int page, int size) {
        Page<AuditLog> p = audits.findAll(PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), PageResponse.MAX_SIZE),
                Sort.by(Sort.Direction.DESC, "occurredAt")));
        Map<Long, String> names = users.findAllById(
                p.getContent().stream().map(AuditLog::getActorId).filter(java.util.Objects::nonNull).distinct().toList())
                .stream().collect(Collectors.toMap(AppUser::getId, AppUser::getFullName, (a, b) -> a));
        return PageResponse.of(p.map(a -> new AuditDto(a.getId(), a.getOccurredAt(),
                a.getActorId() == null ? "Hệ thống" : names.getOrDefault(a.getActorId(), "#" + a.getActorId()),
                a.getAction(), a.getTarget(), a.getDetail(), a.getResult())));
    }
}
