package com.kiobridge.kiobridge.modules.executionplan.controller.dto;

/**
 * POST /internal/simulation/session 응답.
 * 실제 RC5 sessionId와 sessionId가 포함된 submissionEndpoint는 서버 밖으로 내보내지 않는다.
 * 브라우저에는 단명 pairingId만 주고 승인 시 서버가 실제 sessionId로 치환한다.
 */
public record CreateSessionResponse(
    String pairingId,
    String environmentId,
    String initialState,
    long expiresAt
) {}
