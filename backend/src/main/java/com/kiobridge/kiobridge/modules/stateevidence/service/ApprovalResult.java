package com.kiobridge.kiobridge.modules.stateevidence.service;

import java.util.List;

public record ApprovalResult(
    boolean valid,
    EvidenceSummary summary,            // 성공 시에만 채워짐
    List<String> validationMessages,    // 실패 시 사용자용 메시지 목록
    List<RunStep> runSteps,             // 화면 재생용 단계 목록
    ClientExecutionResult execution     // sessionId를 제거한 최소 evidence
) {}
