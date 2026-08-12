package com.kiobridge.kiobridge.modules.member.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.Objects;

@Getter
@Entity
@Table(name = "app_users")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AppUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "login_id", nullable = false, unique = true, length = 50)
    private String loginId;

    @Column(name = "password_hash", nullable = false, length = 100)
    private String passwordHash;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "session_token_hash", unique = true, length = 64)
    private String sessionTokenHash;

    @Column(name = "session_expires_at")
    private Instant sessionExpiresAt;

    public AppUser(String loginId, String passwordHash) {
        this.loginId = loginId;
        this.passwordHash = passwordHash;
        this.createdAt = Instant.now();
    }

    public void startSession(
            String sessionTokenHash,
            Instant sessionExpiresAt
    ) {
        this.sessionTokenHash = Objects.requireNonNull(
                sessionTokenHash,
                "sessionTokenHash는 null일 수 없습니다."
        );
        this.sessionExpiresAt = Objects.requireNonNull(
                sessionExpiresAt,
                "sessionExpiresAt은 null일 수 없습니다."
        );
    }
}