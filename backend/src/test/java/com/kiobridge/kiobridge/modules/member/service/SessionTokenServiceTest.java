package com.kiobridge.kiobridge.modules.member.service;

import com.kiobridge.kiobridge.common.web.ApiException;
import com.kiobridge.kiobridge.modules.member.entity.AppUser;
import com.kiobridge.kiobridge.modules.member.repository.AppUserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SessionTokenServiceTest {

    @Mock
    private AppUserRepository appUserRepository;

    private SessionTokenService service;

    @BeforeEach
    void setUp() {
        service = new SessionTokenService(
                appUserRepository,
                3600
        );
    }

    @Test
    void 세션_원문이_아닌_SHA256_해시를_저장한다() {
        AppUser user =
                new AppUser("hyunwoo", "password-hash");

        SessionTokenService.IssuedSession issued =
                service.issue(user);

        assertThat(
                Base64.getUrlDecoder()
                        .decode(issued.accessToken())
        ).hasSize(32);

        assertThat(user.getSessionTokenHash())
                .isEqualTo(
                        sha256Hex(
                                issued.accessToken()
                        )
                );

        assertThat(user.getSessionExpiresAt())
                .isEqualTo(issued.expiresAt())
                .isAfter(Instant.now());
    }

    @Test
    void 유효한_Bearer_토큰이면_회원_ID를_반환한다() {
        AppUser user =
                new AppUser("hyunwoo", "password-hash");

        ReflectionTestUtils.setField(user, "id", 1L);

        SessionTokenService.IssuedSession issued =
                service.issue(user);

        when(
                appUserRepository
                        .findBySessionTokenHashAndSessionExpiresAtAfter(
                                eq(user.getSessionTokenHash()),
                                any(Instant.class)
                        )
        ).thenReturn(Optional.of(user));

        Long authenticatedUserId =
                service.authenticateBearer(
                        "Bearer " + issued.accessToken()
                );

        assertThat(authenticatedUserId).isEqualTo(1L);
    }

    @Test
    void 인증_헤더가_없으면_401을_반환한다() {
        assertAuthenticationRequired(null);
        verifyNoInteractions(appUserRepository);
    }

    @Test
    void Bearer_형식이_아니면_401을_반환한다() {
        assertAuthenticationRequired("Basic test-token");
        verifyNoInteractions(appUserRepository);
    }

    @Test
    void 존재하지_않거나_만료된_토큰이면_401을_반환한다() {
        when(
                appUserRepository
                        .findBySessionTokenHashAndSessionExpiresAtAfter(
                                any(String.class),
                                any(Instant.class)
                        )
        ).thenReturn(Optional.empty());

        assertAuthenticationRequired("Bearer forged-token");
    }

    private void assertAuthenticationRequired(String authorization) {
        assertThatThrownBy(() ->
                service.authenticateBearer(authorization)
        ).isInstanceOfSatisfying(
                ApiException.class,
                exception -> {
                    assertThat(exception.status())
                            .isEqualTo(HttpStatus.UNAUTHORIZED);
                    assertThat(exception.code())
                            .isEqualTo("AUTHENTICATION_REQUIRED");
                }
        );
    }
    private String sha256Hex(String value) {
        try {
            MessageDigest digest =
                    MessageDigest.getInstance("SHA-256");

            byte[] hashed = digest.digest(
                    value.getBytes(StandardCharsets.UTF_8)
            );

            return HexFormat.of().formatHex(hashed);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(
                    "SHA-256을 사용할 수 없습니다.",
                    e
            );
        }
    }
}
