package com.kiobridge.kiobridge.modules.stateevidence.service;

public record EvidenceSummary(
    String status,
    Object recommendation,
    String stopReason
) {}