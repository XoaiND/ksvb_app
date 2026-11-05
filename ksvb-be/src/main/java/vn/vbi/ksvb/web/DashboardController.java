package vn.vbi.ksvb.web;

import java.time.LocalDate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.vbi.ksvb.security.CurrentUser;
import vn.vbi.ksvb.service.DashboardService;
import vn.vbi.ksvb.web.Dtos.DashboardDto;
import vn.vbi.ksvb.web.Dtos.ReportDto;

@RestController
@RequestMapping("/api")
public class DashboardController {

    private final DashboardService service;
    private final CurrentUser currentUser;

    public DashboardController(DashboardService service, CurrentUser currentUser) {
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
