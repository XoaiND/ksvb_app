package ksvb.signrequest.infra;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import ksvb.signrequest.domain.DocCounter;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DocCounterRepository extends JpaRepository<DocCounter, String> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from DocCounter c where c.counterKey = :key")
    Optional<DocCounter> findForUpdate(@Param("key") String key);
}
