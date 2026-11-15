package vn.vbi.ksvb.template.api;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.vbi.ksvb.shared.security.CurrentUser;
import vn.vbi.ksvb.template.application.SaveTemplate;
import vn.vbi.ksvb.template.application.TemplateDto;
import vn.vbi.ksvb.template.application.TemplateService;

@RestController
@RequestMapping("/api/templates")
public class TemplateController {

    private final TemplateService service;
    private final CurrentUser currentUser;

    public TemplateController(TemplateService service, CurrentUser currentUser) {
        this.service = service;
        this.currentUser = currentUser;
    }

    @GetMapping
    public List<TemplateDto> list() {
        return service.list(currentUser.get());
    }

    @PostMapping
    public ResponseEntity<TemplateDto> create(@Valid @RequestBody SaveTemplate body) {
        return ResponseEntity.status(201).body(service.create(currentUser.get(), body));
    }

    @PostMapping("/{id}/use")
    public TemplateDto use(@PathVariable Long id) {
        return service.markUsed(currentUser.get(), id);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(currentUser.get(), id);
        return ResponseEntity.noContent().build();
    }
}
