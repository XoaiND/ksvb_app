package ksvb.user.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.HashSet;
import java.util.Set;
import ksvb.shared.audit.Auditable;

@Entity
@Table(name = "app_user")
public class AppUser extends Auditable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "full_name", nullable = false, length = 150)
    private String fullName;

    @Column(nullable = false, unique = true, length = 200)
    private String email;

    @Column(name = "employee_code", length = 30)
    private String employeeCode;

    @Column(name = "unit_name", nullable = false, length = 150)
    private String unitName;

    @Column(name = "job_title", length = 150)
    private String jobTitle;

    /** Chỉ có ý nghĩa ở chế độ dev (suy ra quyền). Khi chạy thật quyền lấy từ client role Keycloak. */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UserRole role = UserRole.USER;

    @Column(nullable = false)
    private boolean active = true;

    /** Tên tệp PNG chữ ký đã tách nền (UUID do server sinh); null = chưa có chữ ký. */
    @Column(name = "signature_stored_name", length = 100)
    private String signatureStoredName;

    @Column(name = "signature_updated_at")
    private LocalDateTime signatureUpdatedAt;

    /** Quyền của lần gọi hiện tại (từ token hoặc suy ra ở dev); không lưu DB. */
    @Transient
    private Set<String> permissions = new HashSet<>();

    protected AppUser() {}

    public static AppUser of(Long id, String fullName, String email, String unitName, String jobTitle, UserRole role) {
        AppUser u = new AppUser();
        u.id = id;
        u.fullName = fullName;
        u.email = email;
        u.unitName = unitName;
        u.jobTitle = jobTitle;
        u.role = role;
        return u;
    }

    public boolean can(String permission) {
        return permissions.contains(permission);
    }

    public AppUser withPermissions(Collection<String> granted) {
        this.permissions = new HashSet<>(granted);
        return this;
    }

    public Set<String> getPermissions() { return Set.copyOf(permissions); }

    /** Cập nhật thông tin hiển thị từ token/HRM; trả về true nếu có thay đổi. */
    public boolean syncProfile(String fullName, String employeeCode, String unitName, String jobTitle) {
        boolean changed = false;
        if (hasText(fullName) && !fullName.equals(this.fullName)) { this.fullName = fullName; changed = true; }
        if (hasText(employeeCode) && !employeeCode.equals(this.employeeCode)) { this.employeeCode = employeeCode; changed = true; }
        if (hasText(unitName) && !unitName.equals(this.unitName)) { this.unitName = unitName; changed = true; }
        if (hasText(jobTitle) && !jobTitle.equals(this.jobTitle)) { this.jobTitle = jobTitle; changed = true; }
        return changed;
    }

    /** Đặt ảnh chữ ký mới; trả về tên tệp cũ (để xoá) hoặc null. */
    public String replaceSignature(String storedName, LocalDateTime now) {
        String old = this.signatureStoredName;
        this.signatureStoredName = storedName;
        this.signatureUpdatedAt = now;
        return old;
    }

    /** Bỏ ảnh chữ ký; trả về tên tệp cũ (để xoá) hoặc null. */
    public String clearSignature() {
        String old = this.signatureStoredName;
        this.signatureStoredName = null;
        this.signatureUpdatedAt = null;
        return old;
    }

    public boolean hasSignature() { return signatureStoredName != null; }
    public String getSignatureStoredName() { return signatureStoredName; }
    public LocalDateTime getSignatureUpdatedAt() { return signatureUpdatedAt; }

    private static boolean hasText(String s) {
        return s != null && !s.isBlank();
    }

    public Long getId() { return id; }
    public String getFullName() { return fullName; }
    public String getEmail() { return email; }
    public String getEmployeeCode() { return employeeCode; }
    public void setEmployeeCode(String employeeCode) { this.employeeCode = employeeCode; }
    public String getUnitName() { return unitName; }
    public String getJobTitle() { return jobTitle; }
    public UserRole getRole() { return role; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
}
