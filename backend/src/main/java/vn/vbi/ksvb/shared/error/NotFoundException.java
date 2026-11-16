package vn.vbi.ksvb.shared.error;

/** Không tìm thấy: HTTP 404, {@code code=NOT_FOUND}. */
public class NotFoundException extends RuntimeException {

    public NotFoundException(String what, Object id) {
        super(what + " không tồn tại: " + id);
    }
}
