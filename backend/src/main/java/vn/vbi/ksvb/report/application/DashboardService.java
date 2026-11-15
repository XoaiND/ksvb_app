package vn.vbi.ksvb.report.application;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.vbi.ksvb.signrequest.application.SignRequestService;
import vn.vbi.ksvb.signrequest.application.SignRequestSummary;
import vn.vbi.ksvb.signrequest.domain.DocStatus;
import vn.vbi.ksvb.signrequest.domain.SignRequest;
import vn.vbi.ksvb.signrequest.infra.SignRequestRepository;
import vn.vbi.ksvb.user.domain.AppUser;

/** Số liệu cho Dashboard và màn Báo cáo. Quy mô hiện tại tính trong bộ nhớ; chuyển sang truy vấn tổng hợp khi dữ liệu lớn. */
@Service
public class DashboardService {

    private final SignRequestRepository requests;
    private final SignRequestService signRequests;

    public DashboardService(SignRequestRepository requests, SignRequestService signRequests) {
        this.requests = requests;
        this.signRequests = signRequests;
    }

    @Transactional(readOnly = true)
    public DashboardDto dashboard(AppUser me, int year) {
        List<SignRequest> all = requests.findAll().stream().filter(r -> r.canView(me)).toList();
        Long id = me.getId();

        long pending = all.stream().filter(r -> r.isPendingFor(id)).count();
        long inProgress = all.stream().filter(r -> r.getStatus() == DocStatus.PENDING).count();
        long completed = all.stream().filter(r -> r.getStatus() == DocStatus.COMPLETED).count();
        long bad = all.stream().filter(r -> r.getStatus() == DocStatus.REJECTED
                || r.getStatus() == DocStatus.CANCELLED).count();
        long mine = all.stream().filter(r -> r.isCreator(id)).count();
        long shared = all.stream().filter(SignRequest::isShared).count();
        long expired = all.stream().filter(r -> r.getStatus() == DocStatus.EXPIRED).count();

        List<Integer> byMonth = new ArrayList<>(java.util.Collections.nCopies(12, 0));
        requests.findByStatusAndCompletedAtBetween(DocStatus.COMPLETED,
                LocalDateTime.of(year, 1, 1, 0, 0), LocalDateTime.of(year, 12, 31, 23, 59, 59))
                .stream().filter(r -> r.canView(me))
                .forEach(r -> byMonth.set(r.getCompletedAt().getMonthValue() - 1,
                        byMonth.get(r.getCompletedAt().getMonthValue() - 1) + 1));

        List<SignRequestSummary> todo = signRequests.search(me, "pending", null, null, null, null, 0, 5).content();
        return new DashboardDto(pending, inProgress, completed, bad, mine, shared, expired, year, byMonth, todo);
    }

    @Transactional(readOnly = true)
    public ReportDto report() {
        List<SignRequest> all = requests.findAll();
        List<SignRequest> done = all.stream().filter(r -> r.getStatus() == DocStatus.COMPLETED).toList();
        LocalDate today = LocalDate.now();

        long overdue = all.stream().filter(r -> r.getStatus() == DocStatus.EXPIRED
                || (r.getStatus() == DocStatus.PENDING && r.getDeadline() != null && r.getDeadline().isBefore(today)))
                .count();
        long onTime = done.stream().filter(r -> r.getDeadline() == null
                || !r.getCompletedAt().toLocalDate().isAfter(r.getDeadline())).count();
        double onTimeRate = done.isEmpty() ? 0 : Math.round(onTime * 1000.0 / done.size()) / 10.0;
        double avgHours = done.stream().filter(r -> r.getSubmittedAt() != null)
                .mapToDouble(r -> Duration.between(r.getSubmittedAt(), r.getCompletedAt()).toMinutes() / 60.0)
                .average().orElse(0);

        Map<String, Long> byUnit = all.stream().filter(r -> r.getUnitName() != null)
                .collect(Collectors.groupingBy(SignRequest::getUnitName, Collectors.counting()))
                .entrySet().stream().sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue, (a, b) -> a, LinkedHashMap::new));

        // Thời gian chờ ký trung bình theo người: từ lúc trình đến lúc người đó ký.
        Map<String, List<Double>> waits = new HashMap<>();
        Map<String, Long> overdueBy = new HashMap<>();
        for (SignRequest r : all) {
            if (r.getSubmittedAt() == null) continue;
            r.getParticipants().forEach(p -> {
                String name = p.getUser().getFullName();
                if (p.getSignedAt() != null) {
                    waits.computeIfAbsent(name, k -> new ArrayList<>())
                            .add(Duration.between(r.getSubmittedAt(), p.getSignedAt()).toMinutes() / 60.0);
                } else if (r.getStatus() == DocStatus.EXPIRED) {
                    overdueBy.merge(name, 1L, Long::sum);
                }
            });
        }
        List<SlowSigner> slowest = waits.entrySet().stream()
                .map(e -> new SlowSigner(e.getKey(),
                        Math.round(e.getValue().stream().mapToDouble(Double::doubleValue).average().orElse(0) * 10) / 10.0,
                        overdueBy.getOrDefault(e.getKey(), 0L)))
                .sorted(Comparator.comparingDouble(SlowSigner::avgWaitHours).reversed())
                .limit(5).toList();

        return new ReportDto(all.size(), done.size(), overdue, onTimeRate, Math.round(avgHours * 10) / 10.0, byUnit,
                slowest);
    }
}
