package vn.vbi.ksvb.web;

import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.vbi.ksvb.repo.UserRepository;
import vn.vbi.ksvb.security.CurrentUser;
import vn.vbi.ksvb.web.Dtos.MeDto;
import vn.vbi.ksvb.web.Dtos.PersonDto;

@RestController
@RequestMapping("/api")
public class MeController {

    private final CurrentUser currentUser;
    private final UserRepository users;

    public MeController(CurrentUser currentUser, UserRepository users) {
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
        return users.findByActiveTrueOrderByFullNameAsc().stream().map(PersonDto::of).toList();
    }
}
