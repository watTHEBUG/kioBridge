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
class EmbeddingServiceTest {

    @Autowired
    private EmbeddingService embeddingService;

    @Test
    void 임베딩_호출이_정상적으로_벡터를_반환한다() {
        float[] result = embeddingService.embed("불닭맛");

        assertThat(result).isNotEmpty();
        assertThat(result.length).isEqualTo(1536);
    }
}