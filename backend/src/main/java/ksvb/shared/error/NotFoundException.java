package ksvb.shared.error;

public class NotFoundException extends RuntimeException {
    public NotFoundException(String what, Object id) {
        super(what + " không tồn tại: " + id);
    }
}
