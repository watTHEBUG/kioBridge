package com.kiobridge.kiobridge.modules.member.controller.dto;

import java.time.Instant;

public record LoginResponse(
        Long userId,
        String loginId,
        String accessToken,
        Instant expiresAt
) {
}