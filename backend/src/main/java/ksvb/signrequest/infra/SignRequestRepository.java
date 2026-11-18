package ksvb.signrequest.infra;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import ksvb.signrequest.domain.DocStatus;
import ksvb.signrequest.domain.SignRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface SignRequestRepository extends JpaRepository<SignRequest, Long>, JpaSpecificationExecutor<SignRequest> {

    List<SignRequest> findByStatusAndDeadlineBefore(DocStatus status, LocalDate date);

    List<SignRequest> findByStatusAndCompletedAtBetween(DocStatus status, LocalDateTime from, LocalDateTime to);
}
