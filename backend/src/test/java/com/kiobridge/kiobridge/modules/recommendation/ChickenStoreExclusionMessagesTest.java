package com.kiobridge.kiobridge.modules.recommendation;

import com.kiobridge.kiobridge.contracts.input.context.AllergenId;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ChickenStoreExclusionMessagesTest {

    private final ChickenStoreExclusionMessages messages =
            new ChickenStoreExclusionMessages();

    @Test
    void 단일_알레르기_코드를_한글_이름으로_표시한다() {
        String result = messages.resolve(
                "ALLERGEN_CONFLICT",
                List.of(AllergenId.PEANUT),
                List.of("PEANUT")
        );

        assertThat(result)
                .isEqualTo("땅콩 알레르기와 겹쳐서 제외됐어요.");
    }

    @Test
    void 후보와_실제로_겹친_알레르기만_표시한다() {
        String result = messages.resolve(
                "ALLERGEN_CONFLICT",
                List.of(AllergenId.PEANUT, AllergenId.SOY),
                List.of("SOY")
        );

        assertThat(result)
                .isEqualTo("대두 알레르기와 겹쳐서 제외됐어요.");
    }

    @Test
    void 여러_알레르기가_겹치면_가운데점으로_연결한다() {
        String result = messages.resolve(
                "ALLERGEN_CONFLICT",
                List.of(AllergenId.PEANUT, AllergenId.SOY),
                List.of("PEANUT", "SOY")
        );

        assertThat(result)
                .isEqualTo("땅콩·대두 알레르기와 겹쳐서 제외됐어요.");
    }

    @Test
    void 알_수_없는_코드는_원문을_노출하지_않는다() {
        String result = messages.resolve(
                "ALLERGEN_CONFLICT",
                List.of(AllergenId.UNKNOWN),
                List.of("UNKNOWN")
        );

        assertThat(result)
                .isEqualTo("알레르기 조건과 겹쳐서 제외됐어요.");

        assertThat(result)
                .doesNotContain("UNKNOWN");
    }

    @Test
    void 가격과_품절_메시지는_기존대로_유지한다() {
        assertThat(
                messages.resolve(
                        "PRICE_LIMIT_EXCEEDED",
                        null,
                        null
                )
        ).isEqualTo(
                "설정하신 가격 한도를 넘어서 제외됐어요."
        );

        assertThat(
                messages.resolve(
                        "CANDIDATE_UNAVAILABLE",
                        null,
                        null
                )
        ).isEqualTo(
                "지금은 품절이라 제외됐어요."
        );
    }
}