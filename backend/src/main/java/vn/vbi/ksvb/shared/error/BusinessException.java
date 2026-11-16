package vn.vbi.ksvb.shared.error;

/** Loi nghiep vu, tra ve HTTP 422 kem ma loi. */
public class BusinessException extends RuntimeException {
    private final String code;

    public BusinessException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
