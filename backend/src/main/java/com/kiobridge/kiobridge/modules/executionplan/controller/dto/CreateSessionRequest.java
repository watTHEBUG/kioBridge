package com.kiobridge.kiobridge.modules.executionplan.controller.dto;

import com.kiobridge.kiobridge.common.web.ApiException;

/** POST /internal/simulation/session 요청. */
public record CreateSessionRequest(String environmentId, String claimCode) {
    public CreateSessionRequest {
        if (environmentId == null || environmentId.isBlank()) {
            // Kit ERROR_CATALOG.md 1.계약·형식: 필수 필드 없음
            throw new ApiException("REQUIRED_FIELD_MISSING", "environmentId는 비어있을 수 없습니다.");
        }
        if (claimCode == null || claimCode.isBlank()) {
            // RC5는 실제 Agent claim 검증을 제공하지 않는다. 지금은 QR 흐름에서 값이
            // 누락되는 계약 오류만 막고, 실제품에서는 Agent 검증 결과로 교체한다.
            throw new ApiException("REQUIRED_FIELD_MISSING", "claimCode는 비어있을 수 없습니다.");
        }
    }
}
