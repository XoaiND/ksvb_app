package vn.vbi.ksvb.template.domain;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import java.util.ArrayList;
import java.util.List;
import vn.vbi.ksvb.shared.audit.Auditable;
import vn.vbi.ksvb.signrequest.domain.SignMode;

/** Danh sách người nhận (luồng ký) mẫu. */
@Entity
@Table(name = "sign_template")
public class SignTemplate extends Auditable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private SignMode mode = SignMode.SEQ;

    @Column(name = "used_count", nullable = false)
    private int usedCount;

    @Column(name = "owner_id", nullable = false)
    private Long ownerId;

    @ElementCollection
    @CollectionTable(name = "sign_template_signer", joinColumns = @JoinColumn(name = "template_id"))
    @OrderColumn(name = "signer_order")
    @Column(name = "user_id")
    private List<Long> signerIds = new ArrayList<>();

    protected SignTemplate() {}

    public SignTemplate(String name, SignMode mode, Long ownerId, List<Long> signerIds) {
        this.name = name;
        this.mode = mode == null ? SignMode.SEQ : mode;
        this.ownerId = ownerId;
        this.signerIds = new ArrayList<>(signerIds);
    }

    public void markUsed() {
        this.usedCount++;
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public SignMode getMode() { return mode; }
    public int getUsedCount() { return usedCount; }
    public Long getOwnerId() { return ownerId; }
    public List<Long> getSignerIds() { return signerIds; }
}
