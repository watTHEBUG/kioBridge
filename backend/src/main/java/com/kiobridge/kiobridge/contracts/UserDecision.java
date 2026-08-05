package com.kiobridge.kiobridge.contracts;

import java.util.List;

/**
 * STEP 8 collectUserDecision 의 결과.
 * approved=false 인 경우 ExecutionPlan.actions() 는 반드시 빈 리스트여야 한다 (Kit 검증 규칙).
 */
public record UserDecision(
    boolean approved,
    String rejectedReason,
    List<String> modifiedFields
) {
    public static UserDecision approve() {
        return new UserDecision(true, null, List.of());
    }

    public static UserDecision reject(String reason) {
        return new UserDecision(false, reason, List.of());
    }
}
