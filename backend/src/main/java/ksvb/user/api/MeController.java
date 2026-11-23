package ksvb.user.api;

import java.util.List;
import ksvb.user.application.CurrentAppUser;
import ksvb.user.application.MeDto;
import ksvb.user.application.PersonDto;
import ksvb.user.application.SignatureDto;
import ksvb.user.application.SignatureService;
import ksvb.user.application.UserDirectoryService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/** Người đang đăng nhập, ảnh chữ ký của họ, danh bạ. Chỉ cần đăng nhập (ảnh chữ ký luôn là của chính mình). */
@RestController
@RequestMapping("/api")
public class MeController {

    private final CurrentAppUser currentUser;
    private final UserDirectoryService users;
    private final SignatureService signatures;

    public MeController(CurrentAppUser currentUser, UserDirectoryService users, SignatureService signatures) {
        this.currentUser = currentUser;
        this.users = users;
        this.signatures = signatures;
    }

    @GetMapping("/me")
    public MeDto me() {
        return MeDto.of(currentUser.get());
    }

    /** Danh bạ người dùng đang hoạt động (để chọn người ký / theo dõi). */
    @GetMapping("/users")
    public List<PersonDto> users() {
        currentUser.get();
        return users.activeUsers();
    }

    /** Ảnh chữ ký đã lưu (PNG trong suốt, data URL); 404 nếu chưa có. */
    @GetMapping("/me/signature")
    public SignatureDto signature() {
        return signatures.load(currentUser.get());
    }

    /** Tách nền ảnh tải lên (PNG/JPG ≤ 5 MB) để xem trước; không lưu. */
    @PostMapping(path = "/me/signature/preview", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public SignatureDto previewSignature(@RequestParam("file") MultipartFile file) {
        currentUser.get();
        return signatures.preview(file);
    }

    /** Tách nền ảnh tải lên rồi lưu làm chữ ký (thay ảnh cũ nếu có). */
    @PostMapping(path = "/me/signature", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public SignatureDto saveSignature(@RequestParam("file") MultipartFile file) {
        return signatures.save(currentUser.get(), file);
    }

    @DeleteMapping("/me/signature")
    public ResponseEntity<Void> deleteSignature() {
        signatures.delete(currentUser.get());
        return ResponseEntity.noContent().build();
    }
}
