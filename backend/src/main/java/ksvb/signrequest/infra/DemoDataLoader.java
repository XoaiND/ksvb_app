package ksvb.signrequest.infra;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.stream.Collectors;
import ksvb.signrequest.domain.Priority;
import ksvb.signrequest.domain.SignMode;
import ksvb.signrequest.domain.SignRequest;
import ksvb.template.domain.SignTemplate;
import ksvb.template.infra.TemplateRepository;
import ksvb.user.domain.AppUser;
import ksvb.user.domain.UserRole;
import ksvb.user.infra.UserRepository;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Nạp dữ liệu mẫu khi {@code ksvb.seed-demo=true} (dev/test) và CSDL còn trống.
 * Người dùng id 1..10 khớp bản demo giao diện (id 4 = Phạm Minh Tuấn), id 11 là quản trị.
 */
@Component
@Order(1)
@ConditionalOnProperty(name = "ksvb.seed-demo", havingValue = "true")
public class DemoDataLoader implements ApplicationRunner {

    private final UserRepository users;
    private final SignRequestRepository requests;
    private final TemplateRepository templates;
    private final DocNumberGenerator numbers;

    public DemoDataLoader(UserRepository users, SignRequestRepository requests, TemplateRepository templates,
                          DocNumberGenerator numbers) {
        this.users = users;
        this.requests = requests;
        this.templates = templates;
        this.numbers = numbers;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (users.count() > 0) {
            return;
        }
        String[][] people = {
                {"Nguyễn Văn An", "Phòng Kinh doanh", "Trưởng phòng"},
                {"Trần Thị Bích", "Ban Tổng giám đốc", "Phó tổng giám đốc"},
                {"Lê Quang Cường", "Ban Tổng giám đốc", "Tổng giám đốc"},
                {"Phạm Minh Tuấn", "Phòng Kinh doanh", "Chuyên viên"},
                {"Hoàng Thu Hà", "Phòng Pháp chế", "Trưởng phòng"},
                {"Đỗ Hải Nam", "Phòng Tài chính - Kế toán", "Kế toán trưởng"},
                {"Vũ Thị Lan", "Phòng Nhân sự", "Trưởng phòng"},
                {"Bùi Đức Minh", "Khối Công nghệ", "Giám đốc khối"},
                {"Ngô Thanh Sơn", "Phòng Hành chính", "Chuyên viên"},
                {"Đặng Mai Phương", "Phòng Marketing", "Trưởng phòng"},
        };
        for (int i = 0; i < people.length; i++) {
            users.save(AppUser.of(null, people[i][0], "user" + (i + 1) + "@congty.vn", people[i][1], people[i][2],
                    UserRole.USER));
        }
        users.save(AppUser.of(null, "Quản trị hệ thống", "admin@congty.vn", "Khối Công nghệ", "Quản trị viên",
                UserRole.ADMIN));
        users.flush();

        LocalDate today = LocalDate.now();

        // Tuần tự, người 1 đã ký, đang chờ người 2.
        SignRequest a = make(4, "Hợp đồng cung cấp dịch vụ ABC-01", "Hợp đồng", SignMode.SEQ, List.of(1L, 2L, 3L),
                List.of(5L), false, today.plusDays(3), Priority.HIGH, "Anh chị xem giúp mục 4 về điều khoản thanh toán.");
        a.sign(1L, null, LocalDateTime.now());

        // Chờ người dùng 4 ký (tuần tự, đến lượt).
        make(6, "Tờ trình ngân sách quý IV", "Tờ trình", SignMode.SEQ, List.of(4L, 3L), List.of(), false,
                today.plusDays(2), Priority.URGENT, "Cần chốt trước phiên họp.");

        // Song song, người 6 đã ký; người 4 và 3 còn chờ.
        SignRequest c = make(9, "Hợp đồng thuê văn phòng chi nhánh Miền Nam", "Hợp đồng", SignMode.PAR,
                List.of(4L, 6L, 3L), List.of(), false, today.plusDays(1), Priority.HIGH, null);
        c.sign(6L, null, LocalDateTime.now());

        // Bản nháp của người dùng 4.
        draft(4, "Báo giá gói bảo hiểm doanh nghiệp XYZ", "Báo giá", List.of(1L, 3L), today.plusDays(10));

        // Đã hoàn thành, tài liệu chung, người 4 theo dõi.
        SignRequest e = make(7, "Quyết định bổ nhiệm trưởng phòng Marketing", "Quyết định", SignMode.SEQ,
                List.of(2L, 3L), List.of(4L), true, today.minusDays(5), Priority.NORMAL, null);
        e.sign(2L, null, LocalDateTime.now());
        e.sign(3L, null, LocalDateTime.now());

        // Bị từ chối.
        SignRequest f = make(9, "Biên bản họp giao ban tháng 10", "Biên bản", SignMode.SEQ, List.of(5L, 3L),
                List.of(4L), false, today.plusDays(4), Priority.NORMAL, null);
        f.reject(5L, "Thiếu danh sách người tham dự, đề nghị bổ sung.", LocalDateTime.now());

        templates.save(new SignTemplate("Hợp đồng thương mại", SignMode.SEQ, 4L, List.of(1L, 2L, 3L)));
        templates.save(new SignTemplate("Quyết định nội bộ", SignMode.SEQ, 4L, List.of(2L, 3L)));
        templates.save(new SignTemplate("Biên bản họp", SignMode.PAR, 4L, List.of(5L, 7L, 9L)));
    }

    private SignRequest draft(long creatorId, String title, String type, List<Long> signerIds, LocalDate deadline) {
        AppUser creator = users.findById(creatorId).orElseThrow();
        LocalDateTime now = LocalDateTime.now();
        SignRequest r = new SignRequest(creator, title, type, now);
        r.edit(creatorId, title, type, null, Priority.NORMAL, SignMode.SEQ, deadline, null, false, now);
        r.replaceSigners(signerIds.stream().map(id -> users.findById(id).orElseThrow()).toList());
        r.addAttachment(title + ".pdf", "demo.pdf", 1024, true, now);
        return requests.save(r);
    }

    private SignRequest make(long creatorId, String title, String type, SignMode mode, List<Long> signerIds,
                             List<Long> watcherIds, boolean shared, LocalDate deadline, Priority priority,
                             String message) {
        AppUser creator = users.findById(creatorId).orElseThrow();
        LocalDateTime now = LocalDateTime.now();
        SignRequest r = new SignRequest(creator, title, type, now);
        r.edit(creatorId, title, type, null, priority, mode, deadline, message, shared, now);
        r.replaceSigners(signerIds.stream().map(id -> users.findById(id).orElseThrow()).toList());
        r.replaceWatchers(watcherIds.stream().collect(Collectors.toCollection(LinkedHashSet::new)));
        r.addAttachment(title + ".pdf", "demo.pdf", 1024, true, now);
        r.submit(creatorId, numbers.next(type, LocalDate.now()), now);
        return requests.save(r);
    }
}
