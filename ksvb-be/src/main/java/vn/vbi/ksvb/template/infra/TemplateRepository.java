package vn.vbi.ksvb.template.infra;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import vn.vbi.ksvb.template.domain.SignTemplate;

public interface TemplateRepository extends JpaRepository<SignTemplate, Long> {

    List<SignTemplate> findByOwnerIdOrderByNameAsc(Long ownerId);
}
