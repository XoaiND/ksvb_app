package ksvb.user.application;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.UUID;
import ksvb.config.KsvbProperties;
import ksvb.shared.audit.AuditService;
import ksvb.shared.error.BusinessException;
import ksvb.shared.error.NotFoundException;
import ksvb.user.domain.AppUser;
import ksvb.user.infra.UserRepository;
import org.jspecify.annotations.Nullable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

/**
 * Ảnh chữ ký của người đang đăng nhập: tách nền ({@link SignatureImageProcessor}) rồi lưu PNG vào
 * {@code <KSVB_STORAGE_PATH>/signature/<uuid>.png}. Tệp cũ chỉ bị xoá sau khi transaction commit; tệp mới bị xoá nếu
 * rollback.
 */
@Service
public class SignatureService {

    private static final Logger log = LoggerFactory.getLogger(SignatureService.class);

    private final UserRepository users;
    private final SignatureImageProcessor processor;
    private final AuditService audit;
    private final Path dir;

    public SignatureService(UserRepository users, SignatureImageProcessor processor, AuditService audit,
                            KsvbProperties props) {
        this.users = users;
        this.processor = processor;
        this.audit = audit;
        this.dir = Path.of(props.storage().path()).toAbsolutePath().normalize().resolve("signature");
    }

    /** Tách nền để xem trước; không lưu gì. */
    public SignatureDto preview(MultipartFile file) {
        return SignatureDto.of(processor.process(bytesOf(file)), null);
    }

    @Transactional
    public SignatureDto save(AppUser me, MultipartFile file) {
        byte[] png = processor.process(bytesOf(file));
        AppUser u = reload(me);
        String stored = UUID.randomUUID() + ".png";
        Path target = resolve(stored);
        try {
            Files.createDirectories(dir);
            Files.write(target, png);
        } catch (IOException e) {
            throw new IllegalStateException("Không ghi được ảnh chữ ký", e);
        }
        LocalDateTime now = LocalDateTime.now();
        String old = u.replaceSignature(stored, now);
        afterTransaction(old, stored);
        audit.log("SIGNATURE_UPDATE", "AppUser#" + u.getId(), null);
        return SignatureDto.of(png, now);
    }

    @Transactional(readOnly = true)
    public SignatureDto load(AppUser me) {
        AppUser u = reload(me);
        if (!u.hasSignature()) {
            throw new NotFoundException("Ảnh chữ ký của người dùng", u.getId());
        }
        try {
            return SignatureDto.of(Files.readAllBytes(resolve(u.getSignatureStoredName())), u.getSignatureUpdatedAt());
        } catch (IOException e) {
            throw new NotFoundException("Tệp ảnh chữ ký trên máy chủ của người dùng", u.getId());
        }
    }

    /** Ảnh PNG chữ ký đã lưu của người dùng (để đóng vào PDF khi ký); chưa có → 422 {@code NO_SIGNATURE_IMAGE}. */
    @Transactional(readOnly = true)
    public byte[] pngOf(AppUser user) {
        AppUser u = reload(user);
        if (!u.hasSignature()) {
            throw new BusinessException("NO_SIGNATURE_IMAGE",
                    "Bạn chưa có ảnh chữ ký. Vào Thông tin cá nhân để tải ảnh chữ ký rồi ký lại.");
        }
        try {
            return Files.readAllBytes(resolve(u.getSignatureStoredName()));
        } catch (IOException e) {
            throw new NotFoundException("Tệp ảnh chữ ký trên máy chủ của người dùng", u.getId());
        }
    }

    /**
     * Ảnh chữ ký của một người dưới dạng data URL PNG, hoặc null nếu chưa có / mất tệp. Chỉ gọi sau khi đã kiểm quyền
     * (vd. người đó nằm trong luồng ký của văn bản người gọi được xem).
     */
    public @Nullable String dataUrlOf(AppUser u) {
        if (!u.hasSignature()) {
            return null;
        }
        try {
            return SignatureDto.of(Files.readAllBytes(resolve(u.getSignatureStoredName())), null).imageDataUrl();
        } catch (IOException e) {
            return null;
        }
    }

    @Transactional
    public void delete(AppUser me) {
        AppUser u = reload(me);
        String old = u.clearSignature();
        if (old == null) {
            throw new NotFoundException("Ảnh chữ ký của người dùng", u.getId());
        }
        afterTransaction(old, null);
        audit.log("SIGNATURE_DELETE", "AppUser#" + u.getId(), null);
    }

    private AppUser reload(AppUser me) {
        return users.findById(me.getId()).orElseThrow(() -> new NotFoundException("Người dùng", me.getId()));
    }

    private static byte[] bytesOf(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException("EMPTY_FILE", "Tệp rỗng");
        }
        if (file.getSize() > SignatureImageProcessor.MAX_BYTES) {
            throw new BusinessException("FILE_TOO_LARGE", "Ảnh chữ ký tối đa 5 MB");
        }
        try {
            return file.getBytes();
        } catch (IOException e) {
            throw new IllegalStateException("Không đọc được tệp tải lên", e);
        }
    }

    /** Tên lưu là UUID do server sinh; vẫn kiểm để chắc không ra ngoài thư mục. */
    private Path resolve(String stored) {
        Path p = dir.resolve(stored).normalize();
        if (!p.startsWith(dir)) {
            throw new IllegalStateException("Đường dẫn ảnh chữ ký không hợp lệ");
        }
        return p;
    }

    /** Commit → xoá tệp cũ; rollback → xoá tệp vừa ghi. */
    private void afterTransaction(String oldName, String newName) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                quietDelete(status == STATUS_COMMITTED ? oldName : newName);
            }
        });
    }

    private void quietDelete(String name) {
        if (name == null) return;
        try {
            Files.deleteIfExists(resolve(name));
        } catch (IOException | RuntimeException e) {
            log.warn("Không xoá được ảnh chữ ký {}", name, e);
        }
    }
}
