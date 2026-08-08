package com.kiobridge.kiobridge.modules.executionplan.controller.dto;

import com.kiobridge.kiobridge.contracts.Recommendation;
import com.kiobridge.kiobridge.contracts.UserDecision;
import com.kiobridge.kiobridge.contracts.input.context.ChickenStoreSessionContext;

import java.util.Objects;

/**
 * POST /internal/plan/build 요청.
 * sessionContext는 현재 Kit이 제공하는 유일한 environment인 chicken-store 전용 타입으로 받는다.
 * 다른 environment가 추가되면 이 필드를 다형적으로 받는 방법(예: environmentId 기준 분기 역직렬화)이
 * 필요해진다.
 */
public record BuildExecutionPlanRequest(
    String environmentId,
    Recommendation recommendation,
    UserDecision userDecision,
    ChickenStoreSessionContext sessionContext
) {
    public BuildExecutionPlanRequest {
        Objects.requireNonNull(environmentId, "environmentId는 null일 수 없습니다.");
        Objects.requireNonNull(recommendation, "recommendation은 null일 수 없습니다.");
        Objects.requireNonNull(userDecision, "userDecision은 null일 수 없습니다.");
        Objects.requireNonNull(sessionContext, "sessionContext는 null일 수 없습니다.");
    }
}
