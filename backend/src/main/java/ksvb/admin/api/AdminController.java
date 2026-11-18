package ksvb.admin.api;

import java.util.List;
import ksvb.admin.application.AdminService;
import ksvb.admin.application.AuditDto;
import ksvb.admin.application.UpdateUser;
import ksvb.shared.paging.PageResponse;
import ksvb.user.application.CurrentAppUser;
import ksvb.user.application.PersonDto;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Quản trị: quyền user.manage (người dùng) và audit.view (nhật ký). Phân role làm ở Keycloak. */
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService service;
    private final CurrentAppUser currentUser;

    public AdminController(AdminService service, CurrentAppUser currentUser) {
        this.service = service;
        this.currentUser = currentUser;
    }

    @GetMapping("/users")
    @PreAuthorize("hasAuthority('user.manage')")
    public List<PersonDto> users() {
        return service.listUsers();
    }

    @PatchMapping("/users/{id}")
    @PreAuthorize("hasAuthority('user.manage')")
    public PersonDto updateUser(@PathVariable Long id, @RequestBody UpdateUser body) {
        return service.updateUser(currentUser.get(), id, body);
    }

    @GetMapping("/audit-logs")
    @PreAuthorize("hasAuthority('audit.view')")
    public PageResponse<AuditDto> auditLogs(@RequestParam(defaultValue = "0") int page,
                                    @RequestParam(defaultValue = "20") int size) {
        return service.auditLogs(page, size);
    }
}
