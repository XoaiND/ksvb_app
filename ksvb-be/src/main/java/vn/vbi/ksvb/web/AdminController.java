package vn.vbi.ksvb.web;

import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.vbi.ksvb.security.CurrentUser;
import vn.vbi.ksvb.service.AdminService;
import vn.vbi.ksvb.web.Dtos.AuditDto;
import vn.vbi.ksvb.web.Dtos.PersonDto;
import vn.vbi.ksvb.web.Dtos.UpdateUser;

/** Quản trị: quyền user.manage (người dùng) và audit.view (nhật ký). Phân role làm ở Keycloak. */
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService service;
    private final CurrentUser currentUser;

    public AdminController(AdminService service, CurrentUser currentUser) {
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
    public Page<AuditDto> auditLogs(@RequestParam(defaultValue = "0") int page,
                                    @RequestParam(defaultValue = "20") int size) {
        return service.auditLogs(page, size);
    }
}
