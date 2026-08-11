package com.kiobridge.kiobridge.modules.executionplan.controller.dto;

import com.kiobridge.kiobridge.common.web.ApiException;
import com.kiobridge.kiobridge.contracts.ParticipantSubmission;

import java.util.Objects;

/** POST /internal/simulation/submit-and-run 요청. */
public record SubmitAndRunRequest(String sessionId, ParticipantSubmission submission) {
    public SubmitAndRunRequest {
        if (sessionId == null || sessionId.isBlank()) {
            // Kit ERROR_CATALOG.md 1.계약·형식: 필수 필드 없음
            throw new ApiException("REQUIRED_FIELD_MISSING", "sessionId는 비어있을 수 없습니다.");
        }
        Objects.requireNonNull(submission, "submission은 null일 수 없습니다.");
    }
}
