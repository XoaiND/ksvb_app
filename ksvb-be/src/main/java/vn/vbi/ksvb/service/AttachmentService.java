package vn.vbi.ksvb.service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import vn.vbi.ksvb.common.BusinessException;
import vn.vbi.ksvb.config.KsvbProperties;
import vn.vbi.ksvb.domain.AppUser;
import vn.vbi.ksvb.domain.Attachment;
import vn.vbi.ksvb.domain.DocStatus;
import vn.vbi.ksvb.domain.SignRequest;
import vn.vbi.ksvb.repo.SignRequestRepository;
import vn.vbi.ksvb.web.Dtos.AttachmentDto;

/** Lưu và đọc tệp đính kèm trên đĩa. Tên lưu là UUID do server sinh nên không có path traversal. */
@Service
public class AttachmentService {

    /** Tệp cần ký chỉ nhận PDF; tệp tham khảo nhận thêm các loại văn phòng thông dụng. */
    private static final Set<String> SIGNABLE_EXT = Set.of("pdf");
    private static final Set<String> REFERENCE_EXT = Set.of("pdf", "doc", "docx", "xls", "xlsx", "png", "zip", "rar");

    private final SignRequestRepository requests;
    private final Path baseDir;

    public AttachmentService(SignRequestRepository requests, KsvbProperties props) {
        this.requests = requests;
        this.baseDir = Path.of(props.storage().path()).toAbsolutePath().normalize();
    }

    @Transactional
    public AttachmentDto upload(AppUser me, Long requestId, MultipartFile file, boolean signable) {
        SignRequest r = requests.findById(requestId)
                .orElseThrow(() -> BusinessException.notFound("Không tìm thấy văn bản"));
        if (!r.isCreator(me.getId())) {
            throw BusinessException.forbidden("Chỉ người tạo mới được thêm tệp");
        }
        if (r.getStatus() != DocStatus.DRAFT) {
            throw BusinessException.conflict("Chỉ thêm được tệp khi văn bản là bản nháp");
        }
        if (file == null || file.isEmpty()) {
            throw BusinessException.invalid("Tệp rỗng");
        }

        String original = cleanName(file.getOriginalFilename());
        String ext = extensionOf(original);
        if (!(signable ? SIGNABLE_EXT : REFERENCE_EXT).contains(ext)) {
            throw BusinessException.invalid(signable
                    ? "Tệp cần ký phải là PDF"
                    : "Định dạng tệp không được hỗ trợ (PDF, DOC(X), XLS(X), PNG, ZIP, RAR)");
        }

        String stored = UUID.randomUUID() + "." + ext;
        try {
            Files.createDirectories(baseDir);
            Path target = baseDir.resolve(stored).normalize();
            if (!target.startsWith(baseDir)) {
                throw BusinessException.invalid("Tên tệp không hợp lệ");
            }
            try (InputStream in = file.getInputStream()) {
                if (ext.equals("pdf") && !looksLikePdf(in)) {
                    throw BusinessException.invalid("Nội dung tệp không phải PDF hợp lệ");
                }
            }
            try (InputStream in = file.getInputStream()) {
                Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException e) {
            throw new IllegalStateException("Không ghi được tệp đính kèm", e);
        }

        Attachment a = r.addAttachment(original, stored, file.getSize(), signable, LocalDateTime.now());
        requests.saveAndFlush(r);
        return AttachmentDto.of(a);
    }

    /** Tệp đã tải xuống kèm tên gốc để đặt Content-Disposition. */
    public record Download(Resource resource, String fileName) {}

    @Transactional(readOnly = true)
    public Download download(AppUser me, Long requestId, Long attachmentId) {
        SignRequest r = requests.findById(requestId)
                .orElseThrow(() -> BusinessException.notFound("Không tìm thấy văn bản"));
        if (!r.canView(me)) {
            throw BusinessException.forbidden("Bạn không có quyền xem văn bản này");
        }
        Attachment a = r.getAttachments().stream().filter(x -> x.getId().equals(attachmentId)).findFirst()
                .orElseThrow(() -> BusinessException.notFound("Không tìm thấy tệp đính kèm"));
        Path file = baseDir.resolve(a.getStoredName()).normalize();
        if (!file.startsWith(baseDir) || !Files.isReadable(file)) {
            throw BusinessException.notFound("Tệp không còn trên máy chủ");
        }
        return new Download(new FileSystemResource(file), a.getOriginalName());
    }

    @Transactional
    public void remove(AppUser me, Long requestId, Long attachmentId) {
        SignRequest r = requests.findById(requestId)
                .orElseThrow(() -> BusinessException.notFound("Không tìm thấy văn bản"));
        if (!r.isCreator(me.getId())) {
            throw BusinessException.forbidden("Chỉ người tạo mới được xoá tệp");
        }
        r.removeAttachment(attachmentId);
    }

    private static boolean looksLikePdf(InputStream in) throws IOException {
        byte[] head = in.readNBytes(5);
        return head.length == 5 && head[0] == '%' && head[1] == 'P' && head[2] == 'D' && head[3] == 'F'
                && head[4] == '-';
    }

    private static String cleanName(String name) {
        String n = name == null ? "tep" : name.replace('\\', '/');
        n = n.substring(n.lastIndexOf('/') + 1).trim();
        return n.isEmpty() ? "tep" : (n.length() > 255 ? n.substring(n.length() - 255) : n);
    }

    private static String extensionOf(String name) {
        int dot = name.lastIndexOf('.');
        return dot < 0 ? "" : name.substring(dot + 1).toLowerCase(Locale.ROOT);
    }
}
