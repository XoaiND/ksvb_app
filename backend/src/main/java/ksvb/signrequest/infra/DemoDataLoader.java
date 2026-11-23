package ksvb.signrequest.infra;

import java.awt.BasicStroke;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.geom.Path2D;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import javax.imageio.ImageIO;
import ksvb.config.KsvbProperties;
import ksvb.signrequest.domain.Attachment;
import ksvb.signrequest.domain.Participant;
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
    private final PdfSignatureSlots pdf;
    private final Path storage;

    public DemoDataLoader(UserRepository users, SignRequestRepository requests, TemplateRepository templates,
                          DocNumberGenerator numbers, PdfSignatureSlots pdf, KsvbProperties props) {
        this.users = users;
        this.requests = requests;
        this.templates = templates;
        this.numbers = numbers;
        this.pdf = pdf;
        this.storage = Path.of(props.storage().path()).toAbsolutePath().normalize();
    }

    private record DemoFile(String stored, long size) {}

    /** Ký thay người dùng mẫu và đóng chữ ký mẫu của họ vào PDF (như luồng ký thật). */
    private void demoSign(SignRequest r, long userId) {
        LocalDateTime now = LocalDateTime.now();
        r.sign(userId, null, now);
        Participant p = r.getParticipants().stream().filter(x -> x.getUser().getId() == userId).findFirst().orElseThrow();
        try {
            byte[] png = Files.readAllBytes(storage.resolve("signature").resolve(p.getUser().getSignatureStoredName()));
            for (Attachment a : r.getAttachments()) {
                if (!a.isSignable()) continue;
                byte[] out = pdf.stamp(storage.resolve(a.getCurrentStoredName()), p.getOrderNo(), png,
                        List.of(p.getUser().getFullName(), now.format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"))));
                if (out == null) continue;
                String stored = UUID.randomUUID() + ".pdf";
                Files.write(storage.resolve(stored), out);
                a.recordSigned(stored, out, now);
            }
        } catch (IOException e) {
            throw new IllegalStateException("Không đóng được chữ ký mẫu", e);
        }
    }

    /** Ảnh PNG chữ ký mẫu (nét bút xanh trên nền trong suốt), khác nhau theo người. */
    private String demoSignature(int seed) {
        BufferedImage img = new BufferedImage(420, 150, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = img.createGraphics();
        try {
            g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            g.setColor(new Color(20, 40, 140));
            g.setStroke(new BasicStroke(6, BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND));
            Path2D path = new Path2D.Double();
            path.moveTo(20, 100);
            for (int i = 0; i < 5; i++) {
                double x = 40 + i * 70;
                path.curveTo(x, 20 + seed * 7 % 30, x + 30, 140 - seed * 11 % 40, x + 60, 70 + (i + seed) % 3 * 10);
            }
            g.draw(path);
            g.setStroke(new BasicStroke(3, BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND));
            g.drawLine(60, 130, 380, 115);
        } finally {
            g.dispose();
        }
        String stored = UUID.randomUUID() + ".png";
        try {
            Path dir = storage.resolve("signature");
            Files.createDirectories(dir);
            ImageIO.write(img, "png", dir.resolve(stored).toFile());
        } catch (IOException e) {
            throw new IllegalStateException("Không ghi được chữ ký mẫu", e);
        }
        return stored;
    }

    /** Ghi một PDF mẫu có sẵn ô ký 1..n vào thư mục lưu tệp. */
    private DemoFile demoPdf(String title, int n) {
        byte[] content = pdf.samplePdf(title, n);
        String stored = UUID.randomUUID() + ".pdf";
        try {
            Files.createDirectories(storage);
            Files.write(storage.resolve(stored), content);
        } catch (IOException e) {
            throw new IllegalStateException("Không ghi được PDF mẫu", e);
        }
        return new DemoFile(stored, content.length);
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
        // chữ ký mẫu cho người 1, 2, 3, 6 (người 4 = người dùng thử chính, tự tải ảnh chữ ký)
        for (long id : new long[] {1, 2, 3, 6}) {
            users.findById(id).orElseThrow().replaceSignature(demoSignature((int) id), LocalDateTime.now());
        }

        LocalDate today = LocalDate.now();

        // Tuần tự, người 1 đã ký, đang chờ người 2.
        SignRequest a = make(4, "Hợp đồng cung cấp dịch vụ ABC-01", "Hợp đồng", SignMode.SEQ, List.of(1L, 2L, 3L),
                List.of(5L), false, today.plusDays(3), Priority.HIGH, "Anh chị xem giúp mục 4 về điều khoản thanh toán.");
        demoSign(a, 1L);

        // Chờ người dùng 4 ký (tuần tự, đến lượt).
        make(6, "Tờ trình ngân sách quý IV", "Tờ trình", SignMode.SEQ, List.of(4L, 3L), List.of(), false,
                today.plusDays(2), Priority.URGENT, "Cần chốt trước phiên họp.");

        // Song song, người 6 đã ký; người 4 và 3 còn chờ.
        SignRequest c = make(9, "Hợp đồng thuê văn phòng chi nhánh Miền Nam", "Hợp đồng", SignMode.PAR,
                List.of(4L, 6L, 3L), List.of(), false, today.plusDays(1), Priority.HIGH, null);
        demoSign(c, 6L);

        // Bản nháp của người dùng 4.
        draft(4, "Báo giá gói bảo hiểm doanh nghiệp XYZ", "Báo giá", List.of(1L, 3L), today.plusDays(10));

        // Đã hoàn thành, tài liệu chung, người 4 theo dõi.
        SignRequest e = make(7, "Quyết định bổ nhiệm trưởng phòng Marketing", "Quyết định", SignMode.SEQ,
                List.of(2L, 3L), List.of(4L), true, today.minusDays(5), Priority.NORMAL, null);
        demoSign(e, 2L);
        demoSign(e, 3L);

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
        DemoFile f = demoPdf(title, signerIds.size());
        r.addAttachment(title + ".pdf", f.stored(), f.size(), true, now);
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
        DemoFile f = demoPdf(title, signerIds.size());
        r.addAttachment(title + ".pdf", f.stored(), f.size(), true, now);
        r.submit(creatorId, numbers.next(type, LocalDate.now()), now);
        return requests.save(r);
    }
}
