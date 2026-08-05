package com.kiobridge.kiobridge.contracts;


/**
 * Simulation API(:4000)에 제출하는 최상위 계약(ParticipantSubmission).
 * 스키마 원본: schemas/core/participant-submission.schema.json (Kit 제공)
 *
 * profile / recommendation 은 담당1·담당2가 실제 타입을 확정하면 Object 대신 교체한다.
 * 그 전까지는 Jackson이 그대로 직렬화할 수 있도록 Object로 느슨하게 받는다.
 */
public record ParticipantSubmission(
    String submissionVersion,
    String teamId,
    String environmentId,
    Object profile,        // TODO: 담당1 Profile 타입으로 교체
    Object recommendation, // TODO: 담당2 Recommendation 타입으로 교체
    UserDecision userDecision,
    ExecutionPlan executionPlan
) {}
