package vn.vbi.ksvb.shared.persistence;

import java.util.Objects;
import org.springframework.orm.ObjectOptimisticLockingFailureException;

public final class Versions {
    private Versions() {}

    /** So version client gui len phai bang version hien tai, neu khong la du lieu da bi nguoi khac sua. */
    public static void check(Class<?> type, Object id, Integer current, Integer requested) {
        if (!Objects.equals(current, requested)) {
            throw new ObjectOptimisticLockingFailureException(type, id);
        }
    }
}
