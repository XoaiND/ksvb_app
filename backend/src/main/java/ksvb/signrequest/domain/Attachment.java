package ksvb.signrequest.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.HexFormat;

/** Tệp đính kèm. {@code signable} = tệp cần ký (PDF); false = tệp tham khảo. */
@Entity
@Table(name = "attachment")
public class Attachment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "request_id")
    private SignRequest request;

    @Column(name = "original_name", nullable = false, length = 255)
    private String originalName;

    @Column(name = "stored_name", nullable = false, length = 100)
    private String storedName;

    @Column(name = "size_bytes", nullable = false)
    private long sizeBytes;

    @Column(nullable = false)
    private boolean signable;

    @Column(name = "uploaded_at", nullable = false)
    private LocalDateTime uploadedAt;

    protected Attachment() {}

    Attachment(SignRequest request, String originalName, String storedName, long sizeBytes, boolean signable,
               LocalDateTime uploadedAt) {
        this.request = request;
        this.originalName = originalName;
        this.storedName = storedName;
        this.sizeBytes = sizeBytes;
        this.signable = signable;
        this.uploadedAt = uploadedAt;
    }

    /** Bản đã đóng chữ ký (null = chưa ai ký). */
    @Column(name = "signed_stored_name", length = 100)
    private String signedStoredName;

    @Column(name = "signed_size_bytes")
    private Long signedSizeBytes;

    /** SHA-256 (hex thường) của bản đã ký, để đối chiếu tệp tải về. */
    @Column(name = "signed_sha256", length = 64)
    private String signedSha256;

    @Column(name = "signed_at")
    private LocalDateTime signedAt;

    /**
     * Ghi nhận bản đã ký mới nhất ({@code content} = nội dung tệp vừa ghi, để lưu dung lượng và SHA-256);
     * trả về tên bản đã ký cũ (để xoá) hoặc null.
     */
    public String recordSigned(String storedName, byte[] content, LocalDateTime at) {
        String old = this.signedStoredName;
        this.signedStoredName = storedName;
        this.signedSizeBytes = (long) content.length;
        this.signedSha256 = sha256Hex(content);
        this.signedAt = at;
        return old;
    }

    private static String sha256Hex(byte[] content) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(content));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("JVM thiếu SHA-256", e);
        }
    }

    public String getSignedStoredName() { return signedStoredName; }
    public Long getSignedSizeBytes() { return signedSizeBytes; }
    public String getSignedSha256() { return signedSha256; }
    public LocalDateTime getSignedAt() { return signedAt; }

    /** Tệp đang có hiệu lực: bản đã ký nếu có, không thì bản gốc. */
    public String getCurrentStoredName() { return signedStoredName != null ? signedStoredName : storedName; }

    void replaceFile(String storedName, long sizeBytes) {
        this.storedName = storedName;
        this.sizeBytes = sizeBytes;
    }

    public Long getId() { return id; }
    public String getOriginalName() { return originalName; }
    public String getStoredName() { return storedName; }
    public long getSizeBytes() { return sizeBytes; }
    public boolean isSignable() { return signable; }
    public LocalDateTime getUploadedAt() { return uploadedAt; }
}
