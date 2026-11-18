package ksvb.template.application;

import java.util.List;
import ksvb.signrequest.domain.SignMode;
import ksvb.template.domain.SignTemplate;
import ksvb.user.application.PersonDto;

public record TemplateDto(Long id, String name, SignMode mode, int usedCount, List<PersonDto> signers) {
    public static TemplateDto of(SignTemplate t, List<PersonDto> signers) {
        return new TemplateDto(t.getId(), t.getName(), t.getMode(), t.getUsedCount(), signers);
    }
}
