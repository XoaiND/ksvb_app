package ksvb.user.infra;

import java.util.List;
import java.util.Optional;
import ksvb.user.domain.AppUser;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<AppUser, Long> {

    Optional<AppUser> findByEmailIgnoreCase(String email);

    List<AppUser> findByActiveTrueOrderByFullNameAsc();
}
