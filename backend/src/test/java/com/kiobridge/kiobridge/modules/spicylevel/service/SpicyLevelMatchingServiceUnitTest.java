package com.kiobridge.kiobridge.modules.spicylevel.service;

import com.kiobridge.kiobridge.modules.spicylevel.repository.SpicyLevelAnchorRepository;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class SpicyLevelMatchingServiceUnitTest {

    private final EmbeddingService embeddingService = mock(EmbeddingService.class);
    private final SpicyLevelAnchorRepository repository = mock(SpicyLevelAnchorRepository.class);
    private final SpicyLevelMatchingService service =
        new SpicyLevelMatchingService(embeddingService, repository);

    @Test
    void 안_매운_거는_되묻기로_처리된다() {
        SpicyLevelMatchResult result = service.match("안 매운 거");

        assertThat(result.confident()).isFalse();
        assertThat(result.candidates()).containsExactly("MILD", "MEDIUM");
    }

    @Test
    void 맵지_않게는_되묻기로_처리된다() {
        SpicyLevelMatchResult result = service.match("맵지 않게");

        assertThat(result.confident()).isFalse();
        assertThat(result.candidates()).containsExactly("MILD", "MEDIUM");
    }

    @Test
    void 하나도_안_맵게는_되묻기로_처리된다() {
        SpicyLevelMatchResult result = service.match("하나도 안 맵게");

        assertThat(result.confident()).isFalse();
        assertThat(result.candidates()).containsExactly("MILD", "MEDIUM");
    }

    @Test
    void normal이라는_단어는_부정어로_오탐되지_않는다() {
        // "no"가 부분 문자열로 들어있지만 실제 부정어가 아님 — embeddingService까지 호출돼야 정상
        when(embeddingService.embed("normal")).thenReturn(new float[1536]);
        when(repository.findNearestSpicyLevels("[" + "0.0,".repeat(1535) + "0.0]", 5))
            .thenReturn(java.util.List.of("MEDIUM", "MEDIUM", "MEDIUM", "HOT", "MILD"));

        SpicyLevelMatchResult result = service.match("normal");

        // 부정어 분기로 안 빠지고 임베딩 경로를 탔는지가 핵심 — confident 여부는 mock 데이터에 따름
        assertThat(result.confident()).isTrue();
        assertThat(result.matchedLevel()).isEqualTo("MEDIUM");
    }
}