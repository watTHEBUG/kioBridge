package com.kiobridge.kiobridge.modules.recommendation.controller.dto;

import com.kiobridge.kiobridge.contracts.input.context.ChickenStoreSessionContext;
import com.kiobridge.kiobridge.contracts.input.profile.CanonicalProfile;
import com.kiobridge.kiobridge.modules.recommendation.engine.CandidateFilterResult;

import java.util.Objects;

/**
 * POST /api/v1/recommendations 요청.
 * candidateFilterResult는 직전 /candidate-filters 응답을 그대로 넣어야 한다
 */
public record RecommendationRequest(
    String environmentId,
    CanonicalProfile profile,
    ChickenStoreSessionContext sessionContext,
    CandidateFilterResult candidateFilterResult
) {
    public RecommendationRequest {
        Objects.requireNonNull(environmentId, "environmentId는 null일 수 없습니다.");
        Objects.requireNonNull(profile, "profile은 null일 수 없습니다.");
        Objects.requireNonNull(sessionContext, "sessionContext는 null일 수 없습니다.");
        Objects.requireNonNull(candidateFilterResult, "candidateFilterResult는 null일 수 없습니다.");
    }
}
