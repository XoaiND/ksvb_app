package vn.vbi.ksvb.service;

import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;
import org.springframework.data.jpa.domain.Specification;
import vn.vbi.ksvb.domain.DocStatus;
import vn.vbi.ksvb.domain.Participant;
import vn.vbi.ksvb.domain.SignRequest;
import vn.vbi.ksvb.domain.SignerStatus;

/** Các điều kiện lọc danh sách văn bản (Specification). */
final class SignRequestSpecs {

    private SignRequestSpecs() {}

    enum Scope {
        /** Chờ tôi ký. */
        PENDING,
        /** Do tôi tạo. */
        MINE,
        /** Tài liệu chung. */
        SHARED,
        /** Tôi theo dõi. */
        WATCHING
    }

    static Specification<SignRequest> scope(Scope scope, Long me) {
        return (root, query, cb) -> switch (scope) {
            case PENDING -> {
                query.distinct(true);
                Join<SignRequest, Participant> p = root.join("participants");
                yield cb.and(
                        cb.equal(root.get("status"), DocStatus.PENDING),
                        cb.equal(p.get("user").get("id"), me),
                        cb.equal(p.get("status"), SignerStatus.PENDING));
            }
            case MINE -> cb.equal(root.get("creator").get("id"), me);
            case SHARED -> cb.isTrue(root.<Boolean>get("shared"));
            case WATCHING -> cb.isMember(me, root.<java.util.Set<Long>>get("watcherIds"));
        };
    }

    static Specification<SignRequest> filter(String q, String docType, String unit, DocStatus status) {
        return (root, query, cb) -> {
            List<Predicate> ps = new ArrayList<>();
            if (q != null && !q.isBlank()) {
                String like = "%" + q.trim().toLowerCase() + "%";
                ps.add(cb.or(
                        cb.like(cb.lower(root.get("title")), like),
                        cb.like(cb.lower(cb.coalesce(root.<String>get("code"), "")), like)));
            }
            if (docType != null && !docType.isBlank()) {
                ps.add(cb.equal(root.get("docType"), docType));
            }
            if (unit != null && !unit.isBlank()) {
                ps.add(cb.equal(root.get("unitName"), unit));
            }
            if (status != null) {
                ps.add(cb.equal(root.get("status"), status));
            }
            return cb.and(ps.toArray(new Predicate[0]));
        };
    }
}
