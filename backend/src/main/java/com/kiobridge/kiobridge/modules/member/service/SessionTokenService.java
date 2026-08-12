package com.kiobridge.kiobridge.modules.member.service;

import com.kiobridge.kiobridge.common.web.ApiException;
import com.kiobridge.kiobridge.modules.member.entity.AppUser;
import com.kiobridge.kiobridge.modules.member.repository.AppUserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;

@Service
public class SessionTokenService {

    private static final int TOKEN_BYTES = 32;
    private static final int MAX_TOKEN_LENGTH = 128;
    private static final String BEARER_PREFIX = "Bearer ";

    private final AppUserRepository appUserRepository;
    private final long sessionTtlSeconds;
    private final SecureRandom secureRandom = new SecureRandom();

    public SessionTokenService(
            AppUserRepository appUserRepository,
            @Value("${kiobridge.auth.session-ttl-seconds:28800}")
            long sessionTtlSeconds
    ) {
        if (sessionTtlSeconds <= 0) {
            throw new IllegalArgumentException(
                    "세션 유지시간은 0보다 커야 합니다."
            );
        }

        this.appUserRepository = appUserRepository;
        this.sessionTtlSeconds = sessionTtlSeconds;
    }

    public IssuedSession issue(AppUser user) {
        byte[] bytes = new byte[TOKEN_BYTES];
        secureRandom.nextBytes(bytes);

        String accessToken = Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString(bytes);

        Instant expiresAt = Instant.now()
                .plusSeconds(sessionTtlSeconds);

        user.startSession(
                hash(accessToken),
                expiresAt
        );

        return new IssuedSession(
                accessToken,
                expiresAt
        );
    }

    @Transactional(readOnly = true)
    public Long authenticateBearer(String authorization) {
        String accessToken = extractBearerToken(authorization);

        return appUserRepository
                .findBySessionTokenHashAndSessionExpiresAtAfter(
                        hash(accessToken),
                        Instant.now()
                )
                .map(AppUser::getId)
                .orElseThrow(SessionTokenService::unauthenticated);
    }

    private static String extractBearerToken(String authorization) {
        if (authorization == null
                || authorization.length() <= BEARER_PREFIX.length()
                || !authorization.regionMatches(
                true,
                0,
                BEARER_PREFIX,
                0,
                BEARER_PREFIX.length()
        )) {
            throw unauthenticated();
        }

        String accessToken = authorization
                .substring(BEARER_PREFIX.length())
                .trim();

        if (accessToken.isBlank()
                || accessToken.length() > MAX_TOKEN_LENGTH
                || accessToken.chars()
                .anyMatch(Character::isWhitespace)) {
            throw unauthenticated();
        }

        return accessToken;
    }

    private static String hash(String accessToken) {
        try {
            MessageDigest digest =
                    MessageDigest.getInstance("SHA-256");

            byte[] hashed = digest.digest(
                    accessToken.getBytes(StandardCharsets.UTF_8)
            );

            return HexFormat.of().formatHex(hashed);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(
                    "SHA-256을 사용할 수 없습니다.",
                    e
            );
        }
    }

    private static ApiException unauthenticated() {
        return new ApiException(
                HttpStatus.UNAUTHORIZED,
                "AUTHENTICATION_REQUIRED",
                "로그인이 필요합니다."
        );
    }

    public record IssuedSession(
            String accessToken,
            Instant expiresAt
    ) {
    }
}