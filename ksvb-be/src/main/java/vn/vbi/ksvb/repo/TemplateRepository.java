package vn.vbi.ksvb.repo;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import vn.vbi.ksvb.domain.SignTemplate;

public interface TemplateRepository extends JpaRepository<SignTemplate, Long> {

    List<SignTemplate> findByOwnerIdOrderByNameAsc(Long ownerId);
}
