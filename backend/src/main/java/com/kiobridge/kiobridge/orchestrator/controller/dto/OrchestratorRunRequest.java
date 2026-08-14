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
    String pairingId,                          // 실제 RC5 sessionId를 조회할 일회용 연결 ID
    CanonicalProfile profile,                  // bind 당시 값과 비교할 정규화 프로필
    ChickenStoreSessionContext sessionContext, // bind 당시 값과 비교할 정규화 주문 조건
    Recommendation recommendation,            // 실행계획으로 변환할 최종 추천 결과
    UserDecision userDecision                  // 사용자의 승인·거절·수정 결정
) {
    public OrchestratorRunRequest {
        Objects.requireNonNull(pairingId, "pairingId는 null일 수 없습니다.");
        Objects.requireNonNull(profile, "profile은 null일 수 없습니다.");
        Objects.requireNonNull(sessionContext, "sessionContext는 null일 수 없습니다.");
        Objects.requireNonNull(recommendation, "recommendation은 null일 수 없습니다.");
        Objects.requireNonNull(userDecision, "userDecision은 null일 수 없습니다.");
    }
}
