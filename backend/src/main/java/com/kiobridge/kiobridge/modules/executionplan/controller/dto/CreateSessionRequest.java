package com.kiobridge.kiobridge.modules.executionplan.controller.dto;

import com.kiobridge.kiobridge.common.web.ApiException;

/** POST /internal/simulation/session 요청. */
public record CreateSessionRequest(String environmentId) {
    public CreateSessionRequest {
        if (environmentId == null || environmentId.isBlank()) {
            // Kit ERROR_CATALOG.md 1.계약·형식: 필수 필드 없음
            throw new ApiException("REQUIRED_FIELD_MISSING", "environmentId는 비어있을 수 없습니다.");
        }
    }
}
