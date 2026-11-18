package ksvb.user.api;

import java.util.List;
import ksvb.user.application.CurrentAppUser;
import ksvb.user.application.MeDto;
import ksvb.user.application.PersonDto;
import ksvb.user.application.UserDirectoryService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class MeController {

    private final CurrentAppUser currentUser;
    private final UserDirectoryService users;

    public MeController(CurrentAppUser currentUser, UserDirectoryService users) {
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
