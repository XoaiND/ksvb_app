package vn.vbi.ksvb.signrequest.infra;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import vn.vbi.ksvb.signrequest.domain.NotificationService;
import vn.vbi.ksvb.signrequest.domain.SignRequest;

/** Bản mặc định: chỉ ghi log. Thay bằng bản gửi email khi có máy chủ SMTP. */
@Service
public class LoggingNotificationService implements NotificationService {

    private static final Logger log = LoggerFactory.getLogger(LoggingNotificationService.class);

    @Override
    public void notifyTurn(SignRequest r) {
        log.info("[thông báo] Văn bản {} đang chờ ký", r.getCode());
    }

    @Override
    public void notifyStatusChanged(SignRequest r) {
        log.info("[thông báo] Văn bản {} chuyển sang {}", r.getCode(), r.getStatus());
    }

    @Override
    public void remind(SignRequest r) {
        log.info("[thông báo] Nhắc ký văn bản {}", r.getCode());
    }
}
