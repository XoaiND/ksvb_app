package vn.vbi.ksvb.report.api;

import java.time.LocalDate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.vbi.ksvb.report.application.DashboardDto;
import vn.vbi.ksvb.report.application.DashboardService;
import vn.vbi.ksvb.report.application.ReportDto;
import vn.vbi.ksvb.user.application.CurrentAppUser;

@RestController
@RequestMapping("/api")
public class DashboardController {

    private final DashboardService service;
    private final CurrentAppUser currentUser;

    public DashboardController(DashboardService service, CurrentAppUser currentUser) {
        this.service = service;
        this.currentUser = currentUser;
    }

    @GetMapping("/dashboard")
    public DashboardDto dashboard(@RequestParam(required = false) Integer year) {
        return service.dashboard(currentUser.get(), year == null ? LocalDate.now().getYear() : year);
    }

    /** Báo cáo toàn hệ thống: cần quyền report.view. */
    @GetMapping("/reports/summary")
    @PreAuthorize("hasAuthority('report.view')")
    public ReportDto report() {
        return service.report();
    }
}
