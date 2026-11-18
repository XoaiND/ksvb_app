package ksvb.template.application;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import ksvb.shared.audit.AuditService;
import ksvb.shared.error.BusinessException;
import ksvb.shared.error.NotFoundException;
import ksvb.template.domain.SignTemplate;
import ksvb.template.infra.TemplateRepository;
import ksvb.user.application.PersonDto;
import ksvb.user.domain.AppUser;
import ksvb.user.infra.UserRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TemplateService {

    private final TemplateRepository templates;
    private final UserRepository users;
    private final AuditService audit;

    public TemplateService(TemplateRepository templates, UserRepository users, AuditService audit) {
        this.templates = templates;
        this.users = users;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public List<TemplateDto> list(AppUser me) {
        return templates.findByOwnerIdOrderByNameAsc(me.getId()).stream().map(this::toDto).toList();
    }

    @Transactional
    public TemplateDto create(AppUser me, SaveTemplate in) {
        validateSigners(in.signerIds());
        SignTemplate t = templates.save(new SignTemplate(in.name().trim(), in.mode(), me.getId(), in.signerIds()));
        audit.log("CREATE_TEMPLATE", "Template#" + t.getId(), t.getName());
        return toDto(t);
    }

    /** Ghi nhận mẫu vừa được áp dụng cho một văn bản (thống kê "đã dùng n lần"). */
    @Transactional
    public TemplateDto markUsed(AppUser me, Long id) {
        SignTemplate t = owned(me, id);
        t.markUsed();
        return toDto(t);
    }

    @Transactional
    public void delete(AppUser me, Long id) {
        SignTemplate t = owned(me, id);
        templates.delete(t);
        audit.log("DELETE_TEMPLATE", "Template#" + id, t.getName());
    }

    private SignTemplate owned(AppUser me, Long id) {
        SignTemplate t = templates.findById(id).orElseThrow(() -> new NotFoundException("Mẫu người nhận", id));
        if (!t.getOwnerId().equals(me.getId())) {
            throw new AccessDeniedException("Bạn không có quyền với mẫu này");
        }
        return t;
    }

    private void validateSigners(List<Long> ids) {
        if (ids.stream().distinct().count() != ids.size()) {
            throw new BusinessException("DUPLICATE_SIGNER", "Một người không được xuất hiện hai lần trong mẫu");
        }
        long found = users.findAllById(ids).size();
        if (found != ids.size()) {
            throw new BusinessException("UNKNOWN_USER", "Có người ký không tồn tại");
        }
    }

    private TemplateDto toDto(SignTemplate t) {
        Map<Long, AppUser> byId = users.findAllById(t.getSignerIds()).stream()
                .collect(Collectors.toMap(AppUser::getId, Function.identity()));
        List<PersonDto> signers = new ArrayList<>();
        for (Long id : t.getSignerIds()) {
            AppUser u = byId.get(id);
            if (u != null) {
                signers.add(PersonDto.of(u));
            }
        }
        return TemplateDto.of(t, signers);
    }
}
