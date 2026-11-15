package vn.vbi.ksvb.report.application;

import java.util.List;
import java.util.Map;

public record ReportDto(long total, long completed, long overdue, double onTimeRate, double avgSignHours,
                        Map<String, Long> byUnit, List<SlowSigner> slowestSigners) {}
