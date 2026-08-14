package com.kiobridge.kiobridge.modules.stateevidence.service;

/** 브라우저가 결과 화면을 만드는 데 필요한 evidence 필드만 추린 응답. */
public record ClientExecutionResult(
    String runId,                       // RC5가 발급한 이번 실행 결과 ID
    String result,                      // 실행 최종 결과(PASS/FAIL)
    String stopType,                    // 정상 종료·안전 중단 등 실행 종료 유형
    String stopReason,                  // 실행이 중단되거나 실패한 구체적인 이유
    int executedActionCount,            // 실제로 수행된 키오스크 동작 개수
    ClientReviewSnapshot reviewSnapshot // 브라우저 공개 필드만 남긴 장바구니 결과
) {}
