package ksvb.user.application;

import java.util.List;
import ksvb.user.infra.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Danh bạ người dùng đang hoạt động (chọn người ký / theo dõi). */
@Service
public class UserDirectoryService {

    private final UserRepository users;

    public UserDirectoryService(UserRepository users) {
        this.users = users;
    }

    @Transactional(readOnly = true)
    public List<PersonDto> activeUsers() {
        return users.findByActiveTrueOrderByFullNameAsc().stream().map(PersonDto::of).toList();
    }
}
