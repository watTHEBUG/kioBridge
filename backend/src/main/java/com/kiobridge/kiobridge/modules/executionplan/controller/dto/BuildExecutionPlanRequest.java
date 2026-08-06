package com.kiobridge.kiobridge.modules.executionplan.controller.dto;

import com.kiobridge.kiobridge.contracts.UserDecision;

/**
 * POST /internal/plan/build 요청.
 * recommendation / sessionContext는 담당2가 실제 타입을 확정하면 Object 대신 교체한다.
 */
public record BuildExecutionPlanRequest(
    String environmentId,
    Object recommendation,
    UserDecision userDecision,
    Object sessionContext
) {}
