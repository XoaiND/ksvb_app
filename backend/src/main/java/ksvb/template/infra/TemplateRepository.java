package ksvb.template.infra;

import java.util.List;
import ksvb.template.domain.SignTemplate;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TemplateRepository extends JpaRepository<SignTemplate, Long> {

    List<SignTemplate> findByOwnerIdOrderByNameAsc(Long ownerId);
}
