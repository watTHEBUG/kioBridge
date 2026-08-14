package com.kiobridge.kiobridge.modules.pairing.service;

import com.kiobridge.kiobridge.common.web.ApiException;
import com.kiobridge.kiobridge.contracts.input.context.ChickenStoreSessionContext;
import com.kiobridge.kiobridge.contracts.input.profile.CanonicalProfile;
import org.junit.jupiter.api.Test;

import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

class PairingRegistryTest {

    private final MutableClock clock = new MutableClock(Instant.parse("2026-08-14T00:00:00Z"));
    private final PairingRegistry registry = new PairingRegistry(clock, new SecureRandom());
    private final CanonicalProfile profile = mock(CanonicalProfile.class);
    private final ChickenStoreSessionContext context = mock(ChickenStoreSessionContext.class);

    @Test
    void rc5세션을_노출하지_않는_서로_다른_256비트_pairingId를_발급한다() {
        var first = registry.register("SIM-001", "chicken-store", "SERVICE_TYPE");
        var second = registry.register("SIM-002", "chicken-store", "SERVICE_TYPE");

        assertThat(first.pairingId())
            .hasSize(43)
            .doesNotContain("SIM-001")
            .isNotEqualTo(second.pairingId());
        assertThat(first.expiresAt()).isEqualTo(clock.instant().plus(PairingRegistry.TTL).toEpochMilli());
    }

    @Test
    void 동일한_입력의_재바인딩은_멱등하다() {
        String pairingId = newPairing();

        registry.bindInput(pairingId, profile, context);
        registry.bindInput(pairingId, profile, context);

        var reservation = registry.reserveForExecution(pairingId, profile, context);
        assertThat(reservation.rc5SessionId()).isEqualTo("SIM-001");
    }

    @Test
    void 다른_프로필이나_주문조건으로_바꿀_수_없다() {
        String pairingId = newPairing();
        registry.bindInput(pairingId, profile, context);

        assertThatThrownBy(() -> registry.bindInput(pairingId, mock(CanonicalProfile.class), context))
            .isInstanceOfSatisfying(ApiException.class,
                e -> assertThat(e.code()).isEqualTo("PAIRING_PROFILE_CHANGED"));

        assertThatThrownBy(() -> registry.bindInput(pairingId, profile, mock(ChickenStoreSessionContext.class)))
            .isInstanceOfSatisfying(ApiException.class,
                e -> assertThat(e.code()).isEqualTo("PAIRING_CONTEXT_CHANGED"));
    }

    @Test
    void 승인_입력도_최초_스냅샷과_같아야_한다() {
        String pairingId = newPairing();
        registry.bindInput(pairingId, profile, context);

        assertThatThrownBy(() -> registry.reserveForExecution(
            pairingId, mock(CanonicalProfile.class), context
        )).isInstanceOfSatisfying(ApiException.class,
            e -> assertThat(e.code()).isEqualTo("PAIRING_PROFILE_MISMATCH"));
    }

    @Test
    void pairing당_한_요청만_실행할_수_있다() {
        String pairingId = newPairing();
        registry.bindInput(pairingId, profile, context);
        registry.reserveForExecution(pairingId, profile, context);

        assertThatThrownBy(() -> registry.reserveForExecution(pairingId, profile, context))
            .isInstanceOfSatisfying(ApiException.class,
                e -> assertThat(e.code()).isEqualTo("PAIRING_ALREADY_EXECUTING"));
    }

    @Test
    void 완료하거나_만료된_pairing은_재사용할_수_없다() {
        String closed = newPairing();
        registry.close(closed);
        assertThatThrownBy(() -> registry.bindInput(closed, profile, context))
            .isInstanceOfSatisfying(ApiException.class,
                e -> assertThat(e.code()).isEqualTo("PAIRING_NOT_FOUND"));

        String expired = newPairing();
        clock.advance(Duration.ofMinutes(5));
        assertThatThrownBy(() -> registry.bindInput(expired, profile, context))
            .isInstanceOfSatisfying(ApiException.class,
                e -> assertThat(e.code()).isEqualTo("PAIRING_EXPIRED"));
    }

    private String newPairing() {
        return registry.register("SIM-001", "chicken-store", "SERVICE_TYPE").pairingId();
    }

    private static final class MutableClock extends Clock {
        private Instant instant;

        private MutableClock(Instant instant) {
            this.instant = instant;
        }

        private void advance(Duration duration) {
            instant = instant.plus(duration);
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return instant;
        }
    }
}
