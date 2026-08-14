package com.kiobridge.kiobridge.modules.stateevidence.service;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class ClientReviewSnapshotTest {

    @Test
    void 브라우저에_필요한_장바구니_필드만_남긴다() {
        Map<String, Object> raw = Map.of(
                "cartItems", List.of(Map.of(
                        "name", "매운 순살 닭강정",
                        "price", 6000,
                        "quantity", 2
                )),
                "total", 12000,
                "sessionId", "SIM-SECRET",
                "rc5SessionId", "SIM-SECRET",
                "unknown", "INTERNAL"
        );

        ClientReviewSnapshot result = ClientReviewSnapshot.from(raw);

        assertThat(result.total()).isEqualByComparingTo("12000");
        assertThat(result.cartItems()).hasSize(1);
        assertThat(result.cartItems().getFirst().name())
                .isEqualTo("매운 순살 닭강정");

        assertThat(result.cartItems().getFirst().price()).isEqualByComparingTo("6000");
        assertThat(result.cartItems().getFirst().quantity()).isEqualTo(2);
    }
}
