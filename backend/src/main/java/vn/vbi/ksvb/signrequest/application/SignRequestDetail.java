package vn.vbi.ksvb.signrequest.application;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import org.jspecify.annotations.Nullable;
import vn.vbi.ksvb.signrequest.domain.DocStatus;
import vn.vbi.ksvb.signrequest.domain.Priority;
import vn.vbi.ksvb.signrequest.domain.SignMode;
import vn.vbi.ksvb.user.application.PersonDto;

public record SignRequestDetail(Long id, @Nullable String code, String title, String docType, @Nullable String unitName,
                                @Nullable String description, @Nullable String message,
                                @Nullable String cancellationReason, PersonDto creator,
                                Priority priority, SignMode mode, DocStatus status, boolean shared,
                                @Nullable LocalDate deadline, @Nullable LocalDateTime submittedAt,
                                @Nullable LocalDateTime completedAt,
                                List<ParticipantDto> participants, List<PersonDto> watchers,
                                List<AttachmentDto> attachments, boolean canSign, boolean canCancel,
                                boolean canRecall, boolean canDelete, boolean canEdit) {}
