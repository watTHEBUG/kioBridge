package com.kiobridge.kiobridge.orchestrator.controller.dto;

import com.kiobridge.kiobridge.contracts.Recommendation;
import com.kiobridge.kiobridge.contracts.UserDecision;
import com.kiobridge.kiobridge.contracts.input.context.ChickenStoreSessionContext;
import com.kiobridge.kiobridge.contracts.input.profile.CanonicalProfile;

import java.util.Objects;

/**
 * POST /internal/orchestrator/approve 요청.
 * 실제 RC5 sessionId는 받지 않는다. 단명 pairingId를 PairingRegistry에서 조회하고,
 * 최초 바인딩된 profile/sessionContext와 일치할 때만 실제 sessionId로 치환한다.
 */
public record OrchestratorRunRequest(
    String pairingId,
    CanonicalProfile profile,
    ChickenStoreSessionContext sessionContext,
    Recommendation recommendation,
    UserDecision userDecision
) {
    public OrchestratorRunRequest {
        Objects.requireNonNull(pairingId, "pairingId는 null일 수 없습니다.");
        Objects.requireNonNull(profile, "profile은 null일 수 없습니다.");
        Objects.requireNonNull(sessionContext, "sessionContext는 null일 수 없습니다.");
        Objects.requireNonNull(recommendation, "recommendation은 null일 수 없습니다.");
        Objects.requireNonNull(userDecision, "userDecision은 null일 수 없습니다.");
    }
}
