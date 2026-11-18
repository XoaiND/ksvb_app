package ksvb.signrequest.application;

/** Loại sự kiện của văn bản trình ký ghi ra {@code ksvb_outbox} (tên ổn định, app khác dựa vào). */
public final class SignRequestEvents {

    public static final String AGGREGATE = "SIGN_REQUEST";

    public static final String SUBMITTED = "SIGN_REQUEST_SUBMITTED";
    public static final String SIGNED = "SIGN_REQUEST_SIGNED";
    public static final String COMPLETED = "SIGN_REQUEST_COMPLETED";
    public static final String REJECTED = "SIGN_REQUEST_REJECTED";
    public static final String CANCELLED = "SIGN_REQUEST_CANCELLED";
    public static final String RECALLED = "SIGN_REQUEST_RECALLED";
    public static final String EXPIRED = "SIGN_REQUEST_EXPIRED";

    private SignRequestEvents() {}
}
