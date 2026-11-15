package vn.vbi.ksvb.signrequest.application;

import java.time.LocalDate;
import java.time.LocalDateTime;
import org.jspecify.annotations.Nullable;
import vn.vbi.ksvb.signrequest.domain.DocStatus;
import vn.vbi.ksvb.signrequest.domain.Priority;
import vn.vbi.ksvb.signrequest.domain.SignMode;
import vn.vbi.ksvb.user.application.PersonDto;

public record SignRequestSummary(Long id, @Nullable String code, String title, String docType, @Nullable String unitName,
                                 PersonDto creator, Priority priority, SignMode mode, DocStatus status,
                                 boolean shared, @Nullable LocalDate deadline, @Nullable LocalDateTime submittedAt,
                                 long signedCount, int signerCount, boolean canSign) {}
