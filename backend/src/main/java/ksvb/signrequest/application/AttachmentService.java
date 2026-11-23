package ksvb.signrequest.application;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import ksvb.config.KsvbProperties;
import ksvb.shared.audit.AuditService;
import ksvb.shared.error.BusinessException;
import ksvb.shared.error.ConflictException;
import ksvb.shared.error.NotFoundException;
import ksvb.signrequest.domain.Attachment;
import ksvb.signrequest.domain.DocStatus;
import ksvb.signrequest.domain.SignRequest;
import ksvb.signrequest.infra.PdfSignatureSlots;
import ksvb.signrequest.infra.SignRequestRepository;
import ksvb.user.domain.AppUser;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

/** Lưu và đọc tệp đính kèm trên đĩa. Tên lưu là UUID do server sinh nên không có path traversal. */
@Service
public class AttachmentService {

    /** Tệp cần ký chỉ nhận PDF; tệp tham khảo nhận thêm các loại văn phòng thông dụng. */
    private static final Set<String> SIGNABLE_EXT = Set.of("pdf");
    private static final Set<String> REFERENCE_EXT = Set.of("pdf", "doc", "docx", "xls", "xlsx", "png", "zip", "rar");

    private final SignRequestRepository requests;
    private final Path baseDir;

    private static final Logger log = LoggerFactory.getLogger(AttachmentService.class);

    private final AuditService audit;
    private final PdfSignatureSlots pdf;

    public AttachmentService(SignRequestRepository requests, KsvbProperties props, AuditService audit,
                             PdfSignatureSlots pdf) {
        this.requests = requests;
        this.audit = audit;
        this.pdf = pdf;
        this.baseDir = Path.of(props.storage().path()).toAbsolutePath().normalize();
    }

    @Transactional
    public AttachmentDto upload(AppUser me, Long requestId, MultipartFile file, boolean signable) {
        SignRequest r = requests.findById(requestId)
                .orElseThrow(() -> new NotFoundException("Văn bản", requestId));
        if (!r.isCreator(me.getId())) {
            throw new AccessDeniedException("Chỉ người tạo mới được thêm tệp");
        }
        if (r.getStatus() != DocStatus.DRAFT) {
            throw new ConflictException("NOT_DRAFT", "Chỉ thêm được tệp khi văn bản là bản nháp", null);
        }
        if (file == null || file.isEmpty()) {
            throw new BusinessException("EMPTY_FILE", "Tệp rỗng");
        }

        String original = cleanName(file.getOriginalFilename());
        String ext = extensionOf(original);
        if (!(signable ? SIGNABLE_EXT : REFERENCE_EXT).contains(ext)) {
            throw new BusinessException("INVALID_FILE_TYPE", signable
                    ? "Tệp cần ký phải là PDF"
                    : "Định dạng tệp không được hỗ trợ (PDF, DOC(X), XLS(X), PNG, ZIP, RAR)");
        }

        String stored = UUID.randomUUID() + "." + ext;
        try {
            Files.createDirectories(baseDir);
            Path target = baseDir.resolve(stored).normalize();
            if (!target.startsWith(baseDir)) {
                throw new BusinessException("INVALID_FILE_NAME", "Tên tệp không hợp lệ");
            }
            try (InputStream in = file.getInputStream()) {
                if (ext.equals("pdf") && !looksLikePdf(in)) {
                    throw new BusinessException("INVALID_PDF", "Nội dung tệp không phải PDF hợp lệ");
                }
            }
            if (signable) {
                pdf.validate(file.getBytes()); // phải mở được bằng PDFBox, không mật khẩu (để đặt ô ký)
            }
            try (InputStream in = file.getInputStream()) {
                Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException e) {
            throw new IllegalStateException("Không ghi được tệp đính kèm", e);
        }

        r.addAttachment(original, stored, file.getSize(), signable, LocalDateTime.now());
        // merge thay phần tử mới bằng bản được quản lý (có id) → lấy lại từ kết quả lưu
        Attachment a = requests.saveAndFlush(r).getAttachments().stream()
                .filter(x -> x.getStoredName().equals(stored)).findFirst().orElseThrow();
        audit.log("ATTACH", "SignRequest#" + r.getId(), original + (signable ? " (cần ký)" : ""));
        return AttachmentDto.of(a);
    }

    /** Tệp đã tải xuống kèm tên gốc để đặt Content-Disposition. */
    public record Download(Resource resource, String fileName) {}

    @Transactional(readOnly = true)
    /** Tải tệp gốc, hoặc bản đã đóng chữ ký ({@code signed}, tên thêm " (đã ký)"). */
    public Download download(AppUser me, Long requestId, Long attachmentId, boolean signed) {
        SignRequest r = requests.findById(requestId)
                .orElseThrow(() -> new NotFoundException("Văn bản", requestId));
        if (!r.canView(me)) {
            throw new AccessDeniedException("Bạn không có quyền xem văn bản này");
        }
        Attachment a = r.getAttachments().stream().filter(x -> x.getId().equals(attachmentId)).findFirst()
                .orElseThrow(() -> new NotFoundException("Tệp đính kèm", attachmentId));
        if (signed && a.getSignedStoredName() == null) {
            throw new NotFoundException("Bản đã ký của tệp đính kèm", attachmentId);
        }
        Path file = resolve(signed ? a.getSignedStoredName() : a.getStoredName(), attachmentId);
        String name = a.getOriginalName();
        if (signed) {
            int dot = name.lastIndexOf('.');
            name = (dot < 0 ? name : name.substring(0, dot)) + " (đã ký)" + (dot < 0 ? "" : name.substring(dot));
        }
        return new Download(new FileSystemResource(file), name);
    }

    private Path resolve(String stored, Long attachmentId) {
        Path file = baseDir.resolve(stored).normalize();
        if (!file.startsWith(baseDir) || !Files.isReadable(file)) {
            throw new NotFoundException("Tệp trên máy chủ của tệp đính kèm", attachmentId);
        }
        return file;
    }

    @Transactional
    public void remove(AppUser me, Long requestId, Long attachmentId) {
        SignRequest r = requests.findById(requestId)
                .orElseThrow(() -> new NotFoundException("Văn bản", requestId));
        if (!r.isCreator(me.getId())) {
            throw new AccessDeniedException("Chỉ người tạo mới được xoá tệp");
        }
        r.removeAttachment(attachmentId);
        audit.log("DETACH", "SignRequest#" + r.getId(), "Attachment#" + attachmentId);
    }

    /** Đường dẫn tệp trên đĩa của tệp đính kèm (tên UUID do server sinh). */
    public Path pathOf(Attachment a) {
        return resolve(a.getStoredName(), a.getId());
    }

    /** Đường dẫn tệp đang có hiệu lực: bản đã ký nếu có, không thì bản gốc. */
    public Path currentPathOf(Attachment a) {
        return resolve(a.getCurrentStoredName(), a.getId());
    }

    /** Ghi nội dung mới của một tệp ra tên UUID mới; trả về tên lưu. */
    String storeReplacement(byte[] content, String ext) {
        String stored = UUID.randomUUID() + "." + ext;
        try {
            Files.createDirectories(baseDir);
            Files.write(baseDir.resolve(stored), content);
        } catch (IOException e) {
            throw new IllegalStateException("Không ghi được tệp đính kèm", e);
        }
        return stored;
    }

    /** Commit → xoá tệp cũ; rollback → xoá tệp vừa ghi. */
    void deleteAfterCommit(String oldName, String newName) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                String name = status == STATUS_COMMITTED ? oldName : newName;
                if (name == null) return;
                try {
                    Path p = baseDir.resolve(name).normalize();
                    if (p.startsWith(baseDir)) Files.deleteIfExists(p);
                } catch (IOException | RuntimeException e) {
                    log.warn("Không xoá được tệp {}", name, e);
                }
            }
        });
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
