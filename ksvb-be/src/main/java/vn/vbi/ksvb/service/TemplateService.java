package vn.vbi.ksvb.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.vbi.ksvb.common.BusinessException;
import vn.vbi.ksvb.domain.AppUser;
import vn.vbi.ksvb.domain.SignTemplate;
import vn.vbi.ksvb.repo.TemplateRepository;
import vn.vbi.ksvb.repo.UserRepository;
import vn.vbi.ksvb.web.Dtos.PersonDto;
import vn.vbi.ksvb.web.Dtos.SaveTemplate;
import vn.vbi.ksvb.web.Dtos.TemplateDto;

@Service
public class TemplateService {

    private final TemplateRepository templates;
    private final UserRepository users;

    public TemplateService(TemplateRepository templates, UserRepository users) {
        this.templates = templates;
        this.users = users;
    }

    @Transactional(readOnly = true)
    public List<TemplateDto> list(AppUser me) {
        return templates.findByOwnerIdOrderByNameAsc(me.getId()).stream().map(this::toDto).toList();
    }

    @Transactional
    public TemplateDto create(AppUser me, SaveTemplate in) {
        validateSigners(in.signerIds());
        SignTemplate t = templates.save(new SignTemplate(in.name().trim(), in.mode(), me.getId(), in.signerIds()));
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
        templates.delete(owned(me, id));
    }

    private SignTemplate owned(AppUser me, Long id) {
        SignTemplate t = templates.findById(id).orElseThrow(() -> BusinessException.notFound("Không tìm thấy mẫu"));
        if (!t.getOwnerId().equals(me.getId())) {
            throw BusinessException.forbidden("Bạn không có quyền với mẫu này");
        }
        return t;
    }

    private void validateSigners(List<Long> ids) {
        if (ids.stream().distinct().count() != ids.size()) {
            throw BusinessException.badRequest("Một người không được xuất hiện hai lần trong mẫu");
        }
        long found = users.findAllById(ids).size();
        if (found != ids.size()) {
            throw BusinessException.badRequest("Có người ký không tồn tại");
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
