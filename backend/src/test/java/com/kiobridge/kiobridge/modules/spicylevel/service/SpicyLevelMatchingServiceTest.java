package com.kiobridge.kiobridge.modules.spicylevel.service;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

@Tag("external")
@SpringBootTest
@ActiveProfiles("vector")
@EnabledIfEnvironmentVariable(named = "OPENAI_API_KEY", matches = ".+")
class SpicyLevelMatchingServiceTest {

    @Autowired
    private SpicyLevelMatchingService matchingService;

    @Test
    void 마라맛은_확정되거나_애매하면_되묻는_질문이_생성된다() {
        SpicyLevelMatchResult result = matchingService.match("마라맛");

        if (result.confident()) {
            assertThat(result.matchedLevel()).isEqualTo("HOT");
        } else {
            assertThat(result.clarificationQuestion()).isNotNull();
            assertThat(result.clarificationQuestion()).contains("인가요?");
        }
    }

    @Test
    void 삼삼한맛은_MILD로_확정된다() {
        SpicyLevelMatchResult result = matchingService.match("삼삼한맛");

        assertThat(result.confident()).isTrue();
        assertThat(result.matchedLevel()).isEqualTo("MILD");
    }

    @Test
    void 무관한_단어는_예외없이_결과를_반환한다() {
        SpicyLevelMatchResult result = matchingService.match("파란색 자동차");

        assertThat(result).isNotNull();
        assertThat(result.voteBreakdown()).isNotEmpty();
    }
}