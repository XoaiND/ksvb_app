package vn.vbi.ksvb.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

/** Một người ký trong luồng ký của văn bản. */
@Entity
@Table(name = "participant")
public class Participant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "request_id")
    private SignRequest request;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private AppUser user;

    @Column(name = "order_no", nullable = false)
    private int orderNo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SignerStatus status = SignerStatus.WAITING;

    @Column(name = "signed_at")
    private LocalDateTime signedAt;

    @Column(length = 500)
    private String note;

    protected Participant() {}

    Participant(SignRequest request, AppUser user, int orderNo) {
        this.request = request;
        this.user = user;
        this.orderNo = orderNo;
    }

    void activate() {
        this.status = SignerStatus.PENDING;
    }

    void reset() {
        this.status = SignerStatus.WAITING;
        this.signedAt = null;
        this.note = null;
    }

    void markSigned(String note, LocalDateTime now) {
        this.status = SignerStatus.SIGNED;
        this.signedAt = now;
        this.note = note;
    }

    void markRejected(String reason, LocalDateTime now) {
        this.status = SignerStatus.REJECTED;
        this.signedAt = now;
        this.note = reason;
    }

    public Long getId() { return id; }
    public AppUser getUser() { return user; }
    public int getOrderNo() { return orderNo; }
    public SignerStatus getStatus() { return status; }
    public LocalDateTime getSignedAt() { return signedAt; }
    public String getNote() { return note; }
}
