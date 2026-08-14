package com.kiobridge.kiobridge.modules.stateevidence.service;

/** 브라우저가 결과 화면을 만드는 데 필요한 evidence 필드만 추린 응답. */
public record ClientExecutionResult(
    String runId,
    String result,
    String stopType,
    String stopReason,
    int executedActionCount,
    ClientReviewSnapshot reviewSnapshot
) {}
