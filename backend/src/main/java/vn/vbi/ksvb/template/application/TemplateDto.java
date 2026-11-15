package vn.vbi.ksvb.template.application;

import java.util.List;
import vn.vbi.ksvb.signrequest.domain.SignMode;
import vn.vbi.ksvb.template.domain.SignTemplate;
import vn.vbi.ksvb.user.application.PersonDto;

public record TemplateDto(Long id, String name, SignMode mode, int usedCount, List<PersonDto> signers) {
    public static TemplateDto of(SignTemplate t, List<PersonDto> signers) {
        return new TemplateDto(t.getId(), t.getName(), t.getMode(), t.getUsedCount(), signers);
    }
}
