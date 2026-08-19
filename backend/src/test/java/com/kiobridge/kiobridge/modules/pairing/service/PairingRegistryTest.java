package com.kiobridge.kiobridge.modules.pairing.service;

import com.kiobridge.kiobridge.common.web.ApiException;
import com.kiobridge.kiobridge.contracts.input.context.ChickenStoreSessionContext;
import com.kiobridge.kiobridge.contracts.input.profile.CanonicalProfile;
import org.junit.jupiter.api.BeforeEach;
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
import static org.mockito.Mockito.when;

class PairingRegistryTest {

    private final MutableClock clock = new MutableClock(Instant.parse("2026-08-14T00:00:00Z"));
    private final PairingRegistry registry = new PairingRegistry(clock, new SecureRandom());
    private final CanonicalProfile profile = mock(CanonicalProfile.class);
    private final ChickenStoreSessionContext context = mock(ChickenStoreSessionContext.class);

    @BeforeEach
    void setUp() {
        when(profile.profileId()).thenReturn("user-1");
    }

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
    void 다른_사용자_프로필로는_재바인딩할_수_없다() {
        String pairingId = newPairing();

        CanonicalProfile firstProfile = mock(CanonicalProfile.class);
        CanonicalProfile anotherProfile = mock(CanonicalProfile.class);

        when(firstProfile.profileId()).thenReturn("user-1");
        when(anotherProfile.profileId()).thenReturn("user-2");

        registry.bindInput(pairingId, firstProfile, context);

        assertThatThrownBy(
                () -> registry.bindInput(pairingId, anotherProfile, context)
        )
                .isInstanceOfSatisfying(
                        ApiException.class,
                        e -> assertThat(e.code())
                                .isEqualTo("PAIRING_PROFILE_CHANGED")
                );
    }

    @Test
    void 비어_있는_profileId는_바인딩하지_않는다() {
        for (String invalidProfileId : new String[]{null, "", "   "}) {
            String pairingId = newPairing();
            CanonicalProfile invalidProfile = mock(CanonicalProfile.class);
            when(invalidProfile.profileId()).thenReturn(invalidProfileId);

            assertThatThrownBy(
                    () -> registry.bindInput(pairingId, invalidProfile, context)
            )
                    .isInstanceOfSatisfying(
                            ApiException.class,
                            e -> assertThat(e.code())
                                    .isEqualTo("REQUIRED_FIELD_MISSING")
                    );

            registry.bindInput(pairingId, profile, context);
            assertThat(registry.reserveForExecution(pairingId, profile, context).rc5SessionId())
                    .isEqualTo("SIM-001");
        }
    }

    @Test
    void 같은_사용자는_실행_전까지_주문조건을_변경할_수_있다() {
        String pairingId = newPairing();

        CanonicalProfile firstProfile = mock(CanonicalProfile.class);
        CanonicalProfile reboundProfile = mock(CanonicalProfile.class);

        when(firstProfile.profileId()).thenReturn("user-1");
        when(reboundProfile.profileId()).thenReturn("user-1");

        ChickenStoreSessionContext firstContext =
                mock(ChickenStoreSessionContext.class);
        ChickenStoreSessionContext changedContext =
                mock(ChickenStoreSessionContext.class);

        registry.bindInput(
                pairingId,
                firstProfile,
                firstContext
        );

        registry.bindInput(
                pairingId,
                reboundProfile,
                changedContext
        );


        var reservation = registry.reserveForExecution(
                pairingId,
                reboundProfile,
                changedContext
        );

        assertThat(reservation.rc5SessionId())
                .isEqualTo("SIM-001");
    }

    @Test
    void 승인에는_마지막으로_바인딩한_주문조건을_사용해야_한다() {
        String pairingId = newPairing();

        CanonicalProfile firstProfile = mock(CanonicalProfile.class);
        CanonicalProfile latestProfile = mock(CanonicalProfile.class);

        when(firstProfile.profileId()).thenReturn("user-1");
        when(latestProfile.profileId()).thenReturn("user-1");

        ChickenStoreSessionContext oldContext =
                mock(ChickenStoreSessionContext.class);
        ChickenStoreSessionContext latestContext =
                mock(ChickenStoreSessionContext.class);

        registry.bindInput(
                pairingId,
                firstProfile,
                oldContext
        );

        registry.bindInput(
                pairingId,
                latestProfile,
                latestContext
        );

        assertThatThrownBy(
                () -> registry.reserveForExecution(
                        pairingId,
                        latestProfile,
                        oldContext
                )
        )
                .isInstanceOfSatisfying(
                        ApiException.class,
                        e -> assertThat(e.code())
                                .isEqualTo("PAIRING_CONTEXT_MISMATCH")
                );
    }

    @Test
    void 실행이_시작되면_입력을_다시_바인딩할_수_없다() {
        String pairingId = newPairing();

        when(profile.profileId()).thenReturn("user-1");

        ChickenStoreSessionContext changedContext =
                mock(ChickenStoreSessionContext.class);

        registry.bindInput(pairingId, profile, context);
        registry.reserveForExecution(pairingId, profile, context);

        assertThatThrownBy(
                () -> registry.bindInput(
                        pairingId,
                        profile,
                        changedContext
                )
        )
                .isInstanceOfSatisfying(
                        ApiException.class,
                        e -> assertThat(e.code())
                                .isEqualTo("PAIRING_ALREADY_EXECUTING")
                );
    }

    @Test
    void 승인_입력도_마지막으로_바인딩한_스냅샷과_같아야_한다() {
        String pairingId = newPairing();
        CanonicalProfile firstProfile = mock(CanonicalProfile.class);
        CanonicalProfile latestProfile = mock(CanonicalProfile.class);
        ChickenStoreSessionContext latestContext = mock(ChickenStoreSessionContext.class);

        when(firstProfile.profileId()).thenReturn("user-1");
        when(latestProfile.profileId()).thenReturn("user-1");

        registry.bindInput(pairingId, firstProfile, context);
        registry.bindInput(pairingId, latestProfile, latestContext);

        assertThatThrownBy(() -> registry.reserveForExecution(
            pairingId, firstProfile, latestContext
        )).isInstanceOfSatisfying(ApiException.class,
            e -> assertThat(e.code()).isEqualTo("PAIRING_PROFILE_MISMATCH"));

        assertThat(registry.reserveForExecution(pairingId, latestProfile, latestContext).rc5SessionId())
                .isEqualTo("SIM-001");
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
