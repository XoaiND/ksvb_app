package ksvb.signrequest.api;

import jakarta.validation.Valid;
import java.net.URI;
import ksvb.shared.paging.PageResponse;
import ksvb.signrequest.application.ActionRequest;
import ksvb.signrequest.application.AttachmentDto;
import ksvb.signrequest.application.AttachmentService;
import ksvb.signrequest.application.SaveSignRequest;
import ksvb.signrequest.application.SignRequestDetail;
import ksvb.signrequest.application.SignRequestService;
import ksvb.signrequest.application.SignRequestSummary;
import ksvb.signrequest.domain.DocStatus;
import ksvb.user.application.CurrentAppUser;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * Quyền: soạn/trình/huỷ... cần {@code document.create}; ký/từ chối cần {@code document.sign};
 * xem danh sách/chi tiết/tải tệp chỉ cần đăng nhập (service kiểm tra người đó có liên quan đến văn bản không).
 */
@RestController
@RequestMapping("/api/sign-requests")
public class SignRequestController {

    private static final String CREATE = "hasAuthority('document.create')";
    private static final String SIGN = "hasAuthority('document.sign')";

    private final SignRequestService service;
    private final AttachmentService attachments;
    private final CurrentAppUser currentUser;

    public SignRequestController(SignRequestService service, AttachmentService attachments, CurrentAppUser currentUser) {
        this.service = service;
        this.attachments = attachments;
        this.currentUser = currentUser;
    }

    /** scope = pending (chờ tôi ký) | mine (tôi tạo) | shared (tài liệu chung) | watching (tôi theo dõi). */
    @GetMapping
    public PageResponse<SignRequestSummary> list(@RequestParam(defaultValue = "pending") String scope,
                                         @RequestParam(required = false) String q,
                                         @RequestParam(required = false) String docType,
                                         @RequestParam(required = false) String unit,
                                         @RequestParam(required = false) DocStatus status,
                                         @RequestParam(defaultValue = "0") int page,
                                         @RequestParam(defaultValue = "10") int size) {
        return service.search(currentUser.get(), scope, q, docType, unit, status, page, size);
    }

    @GetMapping("/{id}")
    public SignRequestDetail get(@PathVariable Long id) {
        return service.get(currentUser.get(), id);
    }

    @PostMapping
    @PreAuthorize(CREATE)
    public ResponseEntity<SignRequestDetail> create(@Valid @RequestBody SaveSignRequest body) {
        SignRequestDetail d = service.create(currentUser.get(), body);
        return ResponseEntity.created(URI.create("/api/sign-requests/" + d.id())).body(d);
    }

    @PutMapping("/{id}")
    @PreAuthorize(CREATE)
    public SignRequestDetail update(@PathVariable Long id, @Valid @RequestBody SaveSignRequest body) {
        return service.update(currentUser.get(), id, body);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize(CREATE)
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(currentUser.get(), id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/submit")
    @PreAuthorize(CREATE)
    public SignRequestDetail submit(@PathVariable Long id) {
        return service.submit(currentUser.get(), id);
    }

    @PostMapping("/{id}/sign")
    @PreAuthorize(SIGN)
    public SignRequestDetail sign(@PathVariable Long id, @Valid @RequestBody(required = false) ActionRequest body) {
        return service.sign(currentUser.get(), id, body == null ? null : body.note());
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize(SIGN)
    public SignRequestDetail reject(@PathVariable Long id, @Valid @RequestBody ActionRequest body) {
        return service.reject(currentUser.get(), id, body.note());
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize(CREATE)
    public SignRequestDetail cancel(@PathVariable Long id, @Valid @RequestBody ActionRequest body) {
        return service.cancel(currentUser.get(), id, body.note());
    }

    @PostMapping("/{id}/recall")
    @PreAuthorize(CREATE)
    public SignRequestDetail recall(@PathVariable Long id) {
        return service.recall(currentUser.get(), id);
    }

    @PostMapping("/{id}/remind")
    @PreAuthorize(CREATE)
    public ResponseEntity<Void> remind(@PathVariable Long id) {
        service.remind(currentUser.get(), id);
        return ResponseEntity.noContent().build();
    }

    // ------------------------------------------------------------------ tệp đính kèm

    @PostMapping(path = "/{id}/attachments", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize(CREATE)
    public ResponseEntity<AttachmentDto> upload(@PathVariable Long id, @RequestParam("file") MultipartFile file,
                                                @RequestParam(defaultValue = "true") boolean signable) {
        return ResponseEntity.status(201).body(attachments.upload(currentUser.get(), id, file, signable));
    }

    @GetMapping("/{id}/attachments/{attachmentId}")
    public ResponseEntity<Resource> download(@PathVariable Long id, @PathVariable Long attachmentId) {
        AttachmentService.Download d = attachments.download(currentUser.get(), id, attachmentId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(d.fileName(), java.nio.charset.StandardCharsets.UTF_8)
                                .build().toString())
                .header("X-Content-Type-Options", "nosniff")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(d.resource());
    }

    @DeleteMapping("/{id}/attachments/{attachmentId}")
    @PreAuthorize(CREATE)
    public ResponseEntity<Void> removeAttachment(@PathVariable Long id, @PathVariable Long attachmentId) {
        attachments.remove(currentUser.get(), id, attachmentId);
        return ResponseEntity.noContent().build();
    }
}
