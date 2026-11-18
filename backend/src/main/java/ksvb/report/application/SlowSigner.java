package ksvb.report.application;


public record SlowSigner(String fullName, double avgWaitHours, long overdue) {}
