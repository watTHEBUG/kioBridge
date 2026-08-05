package com.kiobridge.kiobridge.contracts;

import java.util.List;

/**
 * STEP 9 buildExecutionPlan 의 결과물. Simulation API가 검증하는 핵심 객체.
 *
 * 통과 조건(WHAT_YOU_BUILD.md 기준):
 *  - 추천 후보 선택 Action이 정확히 한 번 존재하고 추천과 일치
 *  - 각 Action 이 현재 상태에서 허용되고 expectedBeforeState/After 가 일치
 *  - 검토 경계 상태(reviewBoundaryState) 도달 후 필수 verifier 실행
 *  - verifier 이후 추가 Action 없음, 결제/실제처리 Action 없음
 */
public record ExecutionPlan(
    List<Action> actions
) {
    public static ExecutionPlan empty() {
        return new ExecutionPlan(List.of());
    }
}
