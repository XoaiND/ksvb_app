package ksvb.signrequest.domain;


/** Điểm mở rộng gửi thông báo (email, push...). Lỗi gửi không được làm hỏng giao dịch ký. */
public interface NotificationService {

    /** Có người vừa được đến lượt ký. */
    void notifyTurn(SignRequest request);

    /** Văn bản đổi trạng thái (hoàn thành, từ chối, huỷ, hết hạn...). */
    void notifyStatusChanged(SignRequest request);

    /** Người tạo nhắc người đang chờ ký. */
    void remind(SignRequest request);
}
