package com.kiobridge.kiobridge.modules.voice.service;

import com.kiobridge.kiobridge.modules.voice.entity.PhoneticConfusionAnchor;
import com.kiobridge.kiobridge.modules.voice.repository.PhoneticConfusionAnchorRepository;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * 이 테스트의 핵심은 "구제해야 하는 경우를 구제한다"보다 "구제하면 안 되는
 * 경우까지 구제하지 않는다"에 있다 — PhoneticYesNoMatchingService 클래스
 * 주석에 적은 실측 거리(안녕 기준: 안내=2, 아이고/아까=4, 포장/매장=5)를
 * 그대로 회귀 테스트로 굳힌다.
 */
class PhoneticYesNoMatchingServiceUnitTest {

    private final PhoneticConfusionAnchorRepository repository = mock(PhoneticConfusionAnchorRepository.class);
    private final PhoneticYesNoMatchingService service = new PhoneticYesNoMatchingService(repository);

    private void anchor은_안녕_NO만_있다() {
        when(repository.findAll()).thenReturn(List.of(new PhoneticConfusionAnchor("안녕", "NO")));
    }

    @Test
    void 정확히_같은_안녕은_NO로_구제된다() {
        anchor은_안녕_NO만_있다();

        PhoneticYesNoMatchResult result = service.match("안녕");

        assertThat(result.matched()).isTrue();
        assertThat(result.correctedTo()).isEqualTo("NO");
        assertThat(result.distance()).isEqualTo(0);
    }

    @Test
    void 안뇽처럼_한_자모만_다른_표기흔들림도_구제된다() {
        anchor은_안녕_NO만_있다();

        PhoneticYesNoMatchResult result = service.match("안뇽");

        assertThat(result.matched()).isTrue();
        assertThat(result.correctedTo()).isEqualTo("NO");
    }

    @Test
    void 안내라는_실제_어휘는_구제되지_않는다() {
        anchor은_안녕_NO만_있다();

        PhoneticYesNoMatchResult result = service.match("안내");

        assertThat(result.matched()).isFalse();
    }

    @Test
    void 포장이라는_실제_어휘는_구제되지_않는다() {
        anchor은_안녕_NO만_있다();

        PhoneticYesNoMatchResult result = service.match("포장");

        assertThat(result.matched()).isFalse();
    }

    @Test
    void 매장이라는_실제_어휘는_구제되지_않는다() {
        anchor은_안녕_NO만_있다();

        PhoneticYesNoMatchResult result = service.match("매장");

        assertThat(result.matched()).isFalse();
    }

    @Test
    void 아이고라는_필러는_구제되지_않는다() {
        anchor은_안녕_NO만_있다();

        PhoneticYesNoMatchResult result = service.match("아이고");

        assertThat(result.matched()).isFalse();
    }

    @Test
    void 아까라는_필러는_구제되지_않는다() {
        anchor은_안녕_NO만_있다();

        PhoneticYesNoMatchResult result = service.match("아까");

        assertThat(result.matched()).isFalse();
    }

    @Test
    void 아니오_자체는_이미_예아니오로_처리되므로_이_서비스에서도_구제_대상이_아니다() {
        anchor은_안녕_NO만_있다();

        PhoneticYesNoMatchResult result = service.match("아니오");

        assertThat(result.matched()).isFalse();
    }

    @Test
    void anchor이_없으면_아무것도_매칭되지_않는다() {
        when(repository.findAll()).thenReturn(List.of());

        PhoneticYesNoMatchResult result = service.match("안녕");

        assertThat(result.matched()).isFalse();
    }

    @Test
    void 빈_문자열은_매칭되지_않는다() {
        anchor은_안녕_NO만_있다();

        PhoneticYesNoMatchResult result = service.match("");

        assertThat(result.matched()).isFalse();
    }
}
