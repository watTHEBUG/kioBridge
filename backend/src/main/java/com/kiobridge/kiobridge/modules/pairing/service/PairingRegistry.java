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
 * pairingId는 이번 연결의 bearer capability다. 사용자 profileId는 pairing 동안
 * 변경할 수 없고, 실행 전까지 같은 사용자의 최신 정규화 profile/sessionContext로
 * 다시 바인딩할 수 있다. 주문표를 다시 고르는 것은 사람이 바뀐 것이 아니기 때문이다.
 *
 * 승인 시에는 마지막으로 바인딩한 입력과 승인 입력이 정확히 같은지 검증하고,
 * 한 요청만 EXECUTING 상태로 전환한다.
 *
 * SIMULATION_ONLY 단일 인스턴스용 구현이다. 실제품/다중 인스턴스에서는 같은 원자적
 * 상태 전이를 Redis 또는 DB로 옮기고 실제 Agent claim 검증을 앞단에 추가해야 한다.
 */
@Service
public class PairingRegistry {

    static final Duration TTL = Duration.ofMinutes(5); // pairingId를 사용할 수 있는 최대 시간

    private final ConcurrentHashMap<String, Binding> pairings = new ConcurrentHashMap<>(); // pairingId별 연결 상태
    private final SecureRandom secureRandom; // 추측하기 어려운 256비트 pairingId 생성기
    private final Clock clock;               // 만료 시각 계산 및 테스트 시간 제어용 시계

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

        String pairingId; // 브라우저에 전달할 새 일회용 연결 ID
        Binding binding;  // pairingId에 연결할 RC5 세션 및 입력 상태
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

    /**
     * 사용자 identity(profileId)를 pairing에 묶고, 실행 전까지 같은 사용자의
     * 최신 정규화 입력으로 갱신한다.
     */
    public void bindInput(
            String pairingId,
            CanonicalProfile profile,
            ChickenStoreSessionContext sessionContext
    ) {
        requireText(pairingId, "pairingId");
        Objects.requireNonNull(profile, "profile");
        Objects.requireNonNull(sessionContext, "sessionContext");

        pairings.compute(pairingId, (ignoredPairingId, current) -> {
            Binding binding = requireUsable(current);

            if (binding.status() == Status.EXECUTING) {
                throw conflict(
                        "PAIRING_ALREADY_EXECUTING",
                        "이미 처리 중인 연결입니다."
                );
            }

            // 첫 입력
            if (binding.profileSnapshot() == null) {
                return binding.withInput(profile, sessionContext);
            }

            // pairing에 연결된 사람은 바꿀 수 없다. 주문표와 함께 달라지는 전체
            // profile 값이 아니라 사람 단위로 안정적인 profileId로 identity를 비교한다.
            if (!Objects.equals(
                    binding.profileSnapshot().profileId(),
                    profile.profileId()
            )) {
                throw conflict(
                        "PAIRING_PROFILE_CHANGED",
                        "연결 이후 사용자 프로필이 변경되었습니다."
                );
            }

            /*
             * 같은 사용자라면 실행 전까지 최신 정규화 profile + sessionContext로
             * 갱신한다. 뒤로 가서 다른 주문표를 고른 경우도 이 경로를 탄다.
             *
             * profile도 같이 갱신하는 이유:
             * collectedAt 같은 정규화 메타데이터가 새로 만들어질 수 있기 때문.
             */
            return binding.withInput(profile, sessionContext);
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
        AtomicReference<Reservation> reservation = new AtomicReference<>(); // compute 밖으로 꺼낼 실행 권한

        pairings.compute(pairingId, (ignoredPairingId, current) -> { // current는 실행 예약 전 연결 상태
            Binding binding = requireUsable(current); // 존재 및 만료 검사를 통과한 연결
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
        Instant now = clock.instant(); // 만료된 pairing을 판별할 현재 시각
        pairings.entrySet().removeIf(entry -> !entry.getValue().expiresAt().isAfter(now));
    }

    private String newPairingId() {
        byte[] bytes = new byte[32]; // SecureRandom으로 채울 256비트 난수 버퍼
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
        WAITING_FOR_INPUT, // pairing은 생성됐지만 프로필·주문 조건이 아직 고정되지 않음
        ACTIVE,            // 입력 고정이 끝나 승인 요청을 받을 수 있음
        EXECUTING          // 한 승인 요청이 실행 권한을 선점해 처리 중임
    }

    private record Binding(
        String rc5SessionId,                         // 서버 내부에서만 사용하는 실제 RC5 세션 ID
        String environmentId,                        // RC5 세션이 속한 시뮬레이션 환경 ID
        String initialState,                         // RC5 환경의 시작 상태
        CanonicalProfile profileSnapshot,            // 최초 bind 시 고정한 사용자 프로필
        ChickenStoreSessionContext contextSnapshot,  // 최초 bind 시 고정한 주문 조건
        Instant expiresAt,                           // 이 연결을 사용할 수 있는 마지막 시각
        Status status                                // 입력 대기·활성·실행 중 상태
    ) {
        private Binding withInput(CanonicalProfile profile, ChickenStoreSessionContext context) {
            return new Binding(
                rc5SessionId, environmentId, initialState, profile, context, expiresAt, Status.ACTIVE
            );
        }

        private Binding withStatus(Status nextStatus) { // 원자적으로 전환할 다음 연결 상태
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
        String pairingId,     // 브라우저에 반환할 일회용 연결 ID
        String environmentId, // 연결된 RC5 환경 ID
        String initialState,  // RC5 환경의 시작 상태
        long expiresAt        // pairing 만료 시각(Unix epoch milliseconds)
    ) {}

    public record Reservation(
        String rc5SessionId, // 검증 완료 후 내부 실행에만 사용할 실제 RC5 세션 ID
        String environmentId // 실행 대상 RC5 환경 ID
    ) {}
}
