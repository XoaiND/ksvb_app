package ksvb.signrequest.application;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Chạy 01:00 mỗi ngày. Khi triển khai nhiều instance cần khoá phân tán (vd. ShedLock)
 * để chỉ một instance chạy.
 */
@Component
public class ExpiryJob {

    private static final Logger log = LoggerFactory.getLogger(ExpiryJob.class);

    private final SignRequestService service;

    public ExpiryJob(SignRequestService service) {
        this.service = service;
    }

    @Scheduled(cron = "0 0 1 * * *")
    public void run() {
        int n = service.expireOverdue();
        if (n > 0) {
            log.info("Đã chuyển {} văn bản quá hạn sang EXPIRED", n);
        }
    }
}
