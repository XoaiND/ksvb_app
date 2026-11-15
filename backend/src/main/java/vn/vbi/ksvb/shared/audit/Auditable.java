package vn.vbi.ksvb.shared.audit;

import jakarta.persistence.Column;
import jakarta.persistence.MappedSuperclass;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Version;
import java.time.OffsetDateTime;
import org.hibernate.annotations.Generated;
import org.hibernate.generator.EventType;
import vn.vbi.ksvb.shared.security.CurrentUser;

/**
 * Cột audit dùng chung cho bảng nghiệp vụ (ECOSYSTEM.md 12.7, giống HRM). created_at do DB sinh (DEFAULT now()),
 * updated_at và version_no do trigger trg_touch_row() cập nhật khi UPDATE (migration V3). version_no đồng thời là khoá
 * lạc quan (@Version): trigger và Hibernate cùng tăng 1 đơn vị nên nhất quán.
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
        createdBy = CurrentUser.username();
    }

    @PreUpdate
    void onUpdate() {
        updatedBy = CurrentUser.username();
    }

    public Integer getVersionNo() { return versionNo; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public String getCreatedBy() { return createdBy; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public String getUpdatedBy() { return updatedBy; }
}
