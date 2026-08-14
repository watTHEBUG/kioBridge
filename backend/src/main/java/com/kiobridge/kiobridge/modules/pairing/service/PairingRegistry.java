package com.kiobridge.kiobridge.modules.pairing.service;

import com.kiobridge.kiobridge.common.web.ApiException;
import com.kiobridge.kiobridge.contracts.input.context.ChickenStoreSessionContext;
import com.kiobridge.kiobridge.contracts.input.profile.CanonicalProfile;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicReference;

/**
 * 브라우저에 RC5 sessionId를 노출하지 않고 단명 pairingId로 감싼다.
 *
 * pairingId는 이번 연결의 bearer capability다. 프런트는 메모리에만 보관하고,
 * 서버는 최초 매핑에 사용한 정규화 입력 전체를 고정한다. 승인 시 입력이 달라졌거나
 * 이미 실행 중인 연결이면 RC5를 호출하지 않는다.
 *
 * SIMULATION_ONLY 단일 인스턴스용 구현이다. 실제품/다중 인스턴스에서는 같은 원자적
 * 상태 전이를 Redis 또는 DB로 옮기고 실제 Agent claim 검증을 앞단에 추가해야 한다.
 */
@Service
public class PairingRegistry {

    static final Duration TTL = Duration.ofMinutes(5);

    private final ConcurrentHashMap<String, Binding> pairings = new ConcurrentHashMap<>();
    private final SecureRandom secureRandom;
    private final Clock clock;

    public PairingRegistry() {
        this(Clock.systemUTC(), new SecureRandom());
    }

    PairingRegistry(Clock clock, SecureRandom secureRandom) {
        this.clock = Objects.requireNonNull(clock, "clock");
        this.secureRandom = Objects.requireNonNull(secureRandom, "secureRandom");
    }

    public CreatedPairing register(String rc5SessionId, String environmentId, String initialState) {
        requireText(rc5SessionId, "rc5SessionId");
        requireText(environmentId, "environmentId");
        removeExpired();

        String pairingId;
        Binding binding;
        do {
            pairingId = newPairingId();
            binding = new Binding(
                rc5SessionId,
                environmentId,
                initialState,
                null,
                null,
                clock.instant().plus(TTL),
                Status.WAITING_FOR_INPUT
            );
        } while (pairings.putIfAbsent(pairingId, binding) != null);

        return new CreatedPairing(
            pairingId,
            environmentId,
            initialState,
            binding.expiresAt().toEpochMilli()
        );
    }

    /** 최초 매핑 입력을 고정한다. 같은 입력의 재시도만 멱등하게 허용한다. */
    public void bindInput(
        String pairingId,
        CanonicalProfile profile,
        ChickenStoreSessionContext sessionContext
    ) {
        requireText(pairingId, "pairingId");
        Objects.requireNonNull(profile, "profile");
        Objects.requireNonNull(sessionContext, "sessionContext");

        pairings.compute(pairingId, (ignored, current) -> {
            Binding binding = requireUsable(current);
            if (binding.status() == Status.EXECUTING) {
                throw conflict("PAIRING_ALREADY_EXECUTING", "이미 처리 중인 연결입니다.");
            }
            if (binding.profileSnapshot() == null) {
                return binding.withInput(profile, sessionContext);
            }
            if (!binding.profileSnapshot().equals(profile)) {
                throw conflict("PAIRING_PROFILE_CHANGED", "연결 이후 프로필 정보가 변경되었습니다.");
            }
            if (!binding.contextSnapshot().equals(sessionContext)) {
                throw conflict("PAIRING_CONTEXT_CHANGED", "연결 이후 주문 조건이 변경되었습니다.");
            }
            return binding;
        });
    }

    /** 입력을 재검증하고 한 요청만 EXECUTING으로 전환한다. */
    public Reservation reserveForExecution(
        String pairingId,
        CanonicalProfile profile,
        ChickenStoreSessionContext sessionContext
    ) {
        requireText(pairingId, "pairingId");
        Objects.requireNonNull(profile, "profile");
        Objects.requireNonNull(sessionContext, "sessionContext");
        AtomicReference<Reservation> reservation = new AtomicReference<>();

        pairings.compute(pairingId, (ignored, current) -> {
            Binding binding = requireUsable(current);
            if (binding.profileSnapshot() == null || binding.contextSnapshot() == null) {
                throw conflict("PAIRING_INPUT_NOT_BOUND", "연결에 사용할 주문표가 아직 지정되지 않았습니다.");
            }
            if (!binding.profileSnapshot().equals(profile)) {
                throw forbidden("PAIRING_PROFILE_MISMATCH", "최초 연결 프로필과 승인 프로필이 다릅니다.");
            }
            if (!binding.contextSnapshot().equals(sessionContext)) {
                throw forbidden("PAIRING_CONTEXT_MISMATCH", "최초 확인 조건과 승인 조건이 다릅니다.");
            }
            if (binding.status() == Status.EXECUTING) {
                throw conflict("PAIRING_ALREADY_EXECUTING", "이미 처리 중인 연결입니다.");
            }

            reservation.set(new Reservation(binding.rc5SessionId(), binding.environmentId()));
            return binding.withStatus(Status.EXECUTING);
        });
        return reservation.get();
    }

    /** 실행 성공·실패·예외와 관계없이 연결 권한을 폐기한다. */
    public void close(String pairingId) {
        if (pairingId != null) {
            pairings.remove(pairingId);
        }
    }

    private Binding requireUsable(Binding binding) {
        if (binding == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "PAIRING_NOT_FOUND", "연결 정보를 찾을 수 없습니다.");
        }
        if (!binding.expiresAt().isAfter(clock.instant())) {
            throw new ApiException(HttpStatus.GONE, "PAIRING_EXPIRED", "연결이 만료되었습니다.");
        }
        return binding;
    }

    private void removeExpired() {
        Instant now = clock.instant();
        pairings.entrySet().removeIf(entry -> !entry.getValue().expiresAt().isAfter(now));
    }

    private String newPairingId() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static void requireText(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new ApiException("REQUIRED_FIELD_MISSING", field + "는 비어 있을 수 없습니다.");
        }
    }

    private static ApiException conflict(String code, String message) {
        return new ApiException(HttpStatus.CONFLICT, code, message);
    }

    private static ApiException forbidden(String code, String message) {
        return new ApiException(HttpStatus.FORBIDDEN, code, message);
    }

    private enum Status {
        WAITING_FOR_INPUT,
        ACTIVE,
        EXECUTING
    }

    private record Binding(
        String rc5SessionId,
        String environmentId,
        String initialState,
        CanonicalProfile profileSnapshot,
        ChickenStoreSessionContext contextSnapshot,
        Instant expiresAt,
        Status status
    ) {
        private Binding withInput(CanonicalProfile profile, ChickenStoreSessionContext context) {
            return new Binding(
                rc5SessionId, environmentId, initialState, profile, context, expiresAt, Status.ACTIVE
            );
        }

        private Binding withStatus(Status nextStatus) {
            return new Binding(
                rc5SessionId,
                environmentId,
                initialState,
                profileSnapshot,
                contextSnapshot,
                expiresAt,
                nextStatus
            );
        }
    }

    public record CreatedPairing(
        String pairingId,
        String environmentId,
        String initialState,
        long expiresAt
    ) {}

    public record Reservation(String rc5SessionId, String environmentId) {}
}
