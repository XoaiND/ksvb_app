package vn.vbi.ksvb.shared.audit;

import jakarta.persistence.Column;
import jakarta.persistence.MappedSuperclass;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Version;
import java.time.OffsetDateTime;
import org.hibernate.annotations.Generated;
import org.hibernate.generator.EventType;

/**
 * Cot audit dung chung. created_at do DB sinh (DEFAULT now()),
 * updated_at va version_no do trigger ksvb.trg_touch_row() cap nhat khi UPDATE.
 * version_no dong thoi la khoa lac quan (@Version): trigger va Hibernate cung tang 1 don vi nen nhat quan.
 */
@MappedSuperclass
public abstract class Auditable {

    @Version
    @Column(name = "version_no", nullable = false)
    private Integer versionNo;

    @Generated(event = EventType.INSERT)
    @Column(name = "created_at", insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "created_by", nullable = false, updatable = false, length = 50)
    private String createdBy;

    @Generated(event = {EventType.INSERT, EventType.UPDATE})
    @Column(name = "updated_at", insertable = false, updatable = false)
    private OffsetDateTime updatedAt;

    @Column(name = "updated_by", length = 50)
    private String updatedBy;

    @PrePersist
    void onCreate() {
        createdBy = AuditService.currentActor();
    }

    @PreUpdate
    void onUpdate() {
        updatedBy = AuditService.currentActor();
    }

    public Integer getVersionNo() { return versionNo; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public String getCreatedBy() { return createdBy; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public String getUpdatedBy() { return updatedBy; }
}
