package com.kiobridge.kiobridge.modules.stateevidence.service;

import java.util.List;

public record ApprovalResult(
    boolean valid,                       // RC5 제출물 검증 및 실행 성공 여부
    EvidenceSummary summary,             // 성공 시 화면에 표시할 결과 요약
    List<String> validationMessages,     // 검증 실패 시 사용자에게 보여줄 메시지 목록
    List<RunStep> runSteps,              // 실행 과정을 화면에서 재생할 단계 목록
    ClientExecutionResult execution      // 내부 sessionId를 제거한 최소 실행 결과
) {}
