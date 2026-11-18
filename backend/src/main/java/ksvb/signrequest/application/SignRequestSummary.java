package ksvb.signrequest.application;

import java.time.LocalDate;
import java.time.LocalDateTime;
import ksvb.signrequest.domain.DocStatus;
import ksvb.signrequest.domain.Priority;
import ksvb.signrequest.domain.SignMode;
import ksvb.user.application.PersonDto;
import org.jspecify.annotations.Nullable;

public record SignRequestSummary(Long id, @Nullable String code, String title, String docType, @Nullable String unitName,
                                 PersonDto creator, Priority priority, SignMode mode, DocStatus status,
                                 boolean shared, @Nullable LocalDate deadline, @Nullable LocalDateTime submittedAt,
                                 long signedCount, int signerCount, boolean canSign) {}
