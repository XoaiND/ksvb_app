package vn.vbi.ksvb.signrequest.infra;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import vn.vbi.ksvb.signrequest.domain.DocStatus;
import vn.vbi.ksvb.signrequest.domain.SignRequest;

public interface SignRequestRepository extends JpaRepository<SignRequest, Long>, JpaSpecificationExecutor<SignRequest> {

    List<SignRequest> findByStatusAndDeadlineBefore(DocStatus status, LocalDate date);

    List<SignRequest> findByStatusAndCompletedAtBetween(DocStatus status, LocalDateTime from, LocalDateTime to);
}
