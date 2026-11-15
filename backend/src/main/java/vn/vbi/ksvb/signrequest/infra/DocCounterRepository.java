package vn.vbi.ksvb.signrequest.infra;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.vbi.ksvb.signrequest.domain.DocCounter;

public interface DocCounterRepository extends JpaRepository<DocCounter, String> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from DocCounter c where c.counterKey = :key")
    Optional<DocCounter> findForUpdate(@Param("key") String key);
}
