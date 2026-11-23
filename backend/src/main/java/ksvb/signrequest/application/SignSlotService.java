package ksvb.signrequest.application;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import ksvb.shared.audit.AuditService;
import ksvb.shared.error.BusinessException;
import ksvb.shared.error.NotFoundException;
import ksvb.signrequest.application.SlotDtos.PageImageDto;
import ksvb.signrequest.application.SlotDtos.PageSizeDto;
import ksvb.signrequest.application.SlotDtos.SaveSlots;
import ksvb.signrequest.application.SlotDtos.SlotDto;
import ksvb.signrequest.application.SlotDtos.SlotLayoutDto;
import ksvb.signrequest.domain.Attachment;
import ksvb.signrequest.domain.SignRequest;
import ksvb.signrequest.domain.SignSlot;
import ksvb.signrequest.infra.PdfSignatureSlots;
import ksvb.signrequest.infra.SignRequestRepository;
import ksvb.user.domain.AppUser;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Ô ký trên tệp PDF cần ký: đọc/ghi annotation trực tiếp trong tệp (không lưu DB), ảnh trang để đặt ô trên giao diện,
 * và danh sách số thứ tự ô dùng cho luật trình ký.
 */
@Service
public class SignSlotService {

    private final SignRequestRepository requests;
    private final AttachmentService files;
    private final PdfSignatureSlots pdf;
    private final AuditService audit;

    public SignSlotService(SignRequestRepository requests, AttachmentService files, PdfSignatureSlots pdf,
                           AuditService audit) {
        this.requests = requests;
        this.files = files;
        this.pdf = pdf;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public SlotLayoutDto layout(AppUser me, Long requestId, Long attachmentId) {
        Attachment a = signable(viewable(me, requestId), attachmentId);
        PdfSignatureSlots.Layout l = pdf.read(files.currentPathOf(a));
        return new SlotLayoutDto(
                l.pages().stream().map(p -> new PageSizeDto(p.width(), p.height())).toList(),
                l.slots().stream().map(SlotDto::of).toList());
    }

    @Transactional(readOnly = true)
    public PageImageDto page(AppUser me, Long requestId, Long attachmentId, int page, boolean original) {
        Attachment a = signable(viewable(me, requestId), attachmentId);
        byte[] jpg = pdf.renderPage(original ? files.pathOf(a) : files.currentPathOf(a), page);
        return new PageImageDto("data:image/jpeg;base64," + Base64.getEncoder().encodeToString(jpg));
    }

    @Transactional
    public SlotLayoutDto save(AppUser me, Long requestId, Long attachmentId, SaveSlots body) {
        SignRequest r = requests.findById(requestId).orElseThrow(() -> new NotFoundException("Văn bản", requestId));
        if (!r.isCreator(me.getId())) {
            throw new AccessDeniedException("Chỉ người tạo mới được đặt ô ký");
        }
        Attachment a = signable(r, attachmentId);
        byte[] out = pdf.write(files.pathOf(a), body.slots().stream().map(SlotDto::toSlot).toList());
        String stored = files.storeReplacement(out, "pdf");
        String old = r.replaceAttachmentFile(a.getId(), stored, out.length);
        requests.saveAndFlush(r);
        files.deleteAfterCommit(old, stored);
        audit.log("SLOTS_UPDATE", "SignRequest#" + r.getId(), a.getOriginalName() + ": " + body.slots().size() + " ô ký");
        return layout(me, requestId, attachmentId);
    }

    /**
     * Đóng ảnh chữ ký của người ký thứ {@code orderNo} vào mọi ô của họ trên các tệp cần ký: đọc bản đang có hiệu lực
     * (bản đã ký trước đó, hoặc bản gốc), ghi ra bản đã ký mới; bản đã ký cũ xoá sau commit, bản gốc giữ nguyên.
     * Trả về số tệp đã đóng chữ ký.
     */
    public int stamp(SignRequest r, int orderNo, byte[] png, List<String> caption) {
        int count = 0;
        for (Attachment a : r.getAttachments()) {
            if (!a.isSignable()) continue;
            byte[] out = pdf.stamp(files.currentPathOf(a), orderNo, png, caption);
            if (out == null) continue;
            String stored = files.storeReplacement(out, "pdf");
            String oldSigned = a.recordSigned(stored, out, LocalDateTime.now());
            files.deleteAfterCommit(oldSigned, stored);
            count++;
        }
        return count;
    }

    /** Số thứ tự của mọi ô ký trên các tệp cần ký của văn bản (để kiểm khi trình ký). */
    public List<Integer> slotOrders(SignRequest r) {
        List<Integer> orders = new ArrayList<>();
        for (Attachment a : r.getAttachments()) {
            if (a.isSignable()) {
                pdf.read(files.pathOf(a)).slots().stream().map(SignSlot::orderNo).forEach(orders::add);
            }
        }
        return orders;
    }

    private SignRequest viewable(AppUser me, Long requestId) {
        SignRequest r = requests.findById(requestId).orElseThrow(() -> new NotFoundException("Văn bản", requestId));
        if (!r.canView(me)) {
            throw new AccessDeniedException("Bạn không có quyền xem văn bản này");
        }
        return r;
    }

    private static Attachment signable(SignRequest r, Long attachmentId) {
        Attachment a = r.getAttachments().stream().filter(x -> x.getId().equals(attachmentId)).findFirst()
                .orElseThrow(() -> new NotFoundException("Tệp đính kèm", attachmentId));
        if (!a.isSignable()) {
            throw new BusinessException("NOT_SIGNABLE", "Chỉ tệp cần ký mới có ô ký");
        }
        return a;
    }
}
