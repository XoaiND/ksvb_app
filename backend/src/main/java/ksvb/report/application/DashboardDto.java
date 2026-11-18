package ksvb.report.application;

import java.util.List;
import ksvb.signrequest.application.SignRequestSummary;

public record DashboardDto(long pendingForMe, long inProgress, long completed, long rejectedOrCancelled,
                           long mine, long shared, long expired, int year, List<Integer> completedByMonth,
                           List<SignRequestSummary> todo) {}
