package vn.vbi.ksvb.user.api;

import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.vbi.ksvb.shared.security.CurrentUser;
import vn.vbi.ksvb.user.application.MeDto;
import vn.vbi.ksvb.user.application.PersonDto;
import vn.vbi.ksvb.user.application.UserDirectoryService;

@RestController
@RequestMapping("/api")
public class MeController {

    private final CurrentUser currentUser;
    private final UserDirectoryService users;

    public MeController(CurrentUser currentUser, UserDirectoryService users) {
        this.currentUser = currentUser;
        this.users = users;
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
}
