package com.kiobridge.kiobridge.contracts;

import com.kiobridge.kiobridge.contracts.input.context.SessionContextBase;
import com.kiobridge.kiobridge.contracts.input.profile.CanonicalProfile;

import java.util.Objects;

/**
 * Simulation API(:4000)에 제출하는 최상위 계약(ParticipantSubmission).
 * 스키마 원본: schemas/core/participant-submission.schema.json (Kit 제공)
 * required 9개 필드를 그대로 반영한다: inputContractVersion, submissionVersion, teamId,
 * environmentId, profile, sessionContext, recommendation, userDecision, executionPlan.
 *
 * profile은 담당1의 CanonicalProfile, sessionContext는 담당1의 SessionContextBase 구현체로 받는다
 * (환경마다 F/P/H/C 실제 타입이 달라 여기서는 와일드카드로 받고, chicken-store 전용 분기가 필요한
 * 곳(ExecutionPlanService.buildExecutionPlan 등)에서 각자 구체 타입으로 다운캐스트한다).
 *
 * 9개 필드 모두 Kit 스키마상 required이므로, 누락된 값이 조용히 null로 흘러가
 * userDecision.approved() 같은 곳에서 NPE로 터지거나 빈 environmentId/sessionId가
 * 그대로 Simulation API 호출로 넘어가지 않도록 요청 경계(이 record)에서 즉시 거부한다.
 */
public record ParticipantSubmission(
    String inputContractVersion,
    String submissionVersion,
    String teamId,
    String environmentId,
    CanonicalProfile profile,
    SessionContextBase<?, ?, ?, ?> sessionContext,
    Recommendation recommendation,
    UserDecision userDecision,
    ExecutionPlan executionPlan
) {
    public ParticipantSubmission {
        requireNonBlank(inputContractVersion, "inputContractVersion");
        requireNonBlank(submissionVersion, "submissionVersion");
        requireNonBlank(teamId, "teamId");
        requireNonBlank(environmentId, "environmentId");
        Objects.requireNonNull(profile, "profile는 null일 수 없습니다.");
        Objects.requireNonNull(sessionContext, "sessionContext는 null일 수 없습니다.");
        Objects.requireNonNull(recommendation, "recommendation은 null일 수 없습니다.");
        Objects.requireNonNull(userDecision, "userDecision은 null일 수 없습니다.");
        Objects.requireNonNull(executionPlan, "executionPlan은 null일 수 없습니다.");

        if (!userDecision.approved() && !executionPlan.actions().isEmpty()) {
            throw new IllegalArgumentException(
                "userDecision.approved=false 인데 executionPlan.actions가 비어있지 않습니다. "
                    + "Kit 검증 규칙 위반입니다."
            );
        }
    }

    private static void requireNonBlank(String value, String fieldName) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(fieldName + "는 비어있을 수 없습니다.");
        }
    }
}
