package ksvb.signrequest.application;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import ksvb.signrequest.domain.DocStatus;
import ksvb.signrequest.domain.Priority;
import ksvb.signrequest.domain.SignMode;
import ksvb.user.application.PersonDto;
import org.jspecify.annotations.Nullable;

public record SignRequestDetail(Long id, @Nullable String code, String title, String docType, @Nullable String unitName,
                                @Nullable String description, @Nullable String message,
                                @Nullable String cancellationReason, PersonDto creator,
                                Priority priority, SignMode mode, DocStatus status, boolean shared,
                                @Nullable LocalDate deadline, @Nullable LocalDateTime submittedAt,
                                @Nullable LocalDateTime completedAt,
                                List<ParticipantDto> participants, List<PersonDto> watchers,
                                List<AttachmentDto> attachments, boolean canSign, boolean canCancel,
                                boolean canRecall, boolean canDelete, boolean canEdit,
                                /** Khoá lạc quan: gửi lại khi sửa (PUT). */ Integer versionNo) {}
