package com.kiobridge.kiobridge.common.text;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class LevenshteinDistanceTest {

    @Test
    void 같은_목록은_거리가_0이다() {
        List<Character> a = List.of('ㅇ', 'ㅏ', 'ㄴ');
        assertThat(LevenshteinDistance.거리(a, a)).isEqualTo(0);
    }

    @Test
    void 한_글자_치환은_거리가_1이다() {
        List<Character> a = List.of('ㅇ', 'ㅏ', 'ㄴ');
        List<Character> b = List.of('ㅇ', 'ㅏ', 'ㅁ');
        assertThat(LevenshteinDistance.거리(a, b)).isEqualTo(1);
    }

    @Test
    void 한_글자_추가는_거리가_1이다() {
        List<Character> a = List.of('ㅇ', 'ㅏ', 'ㄴ');
        List<Character> b = List.of('ㅇ', 'ㅏ', 'ㄴ', 'ㄴ');
        assertThat(LevenshteinDistance.거리(a, b)).isEqualTo(1);
    }

    @Test
    void 안녕과_아니오의_자모_거리는_3이다() {
        List<Character> 안녕 = HangulJamo.분해("안녕");
        List<Character> 아니오 = HangulJamo.분해("아니오");
        assertThat(LevenshteinDistance.거리(안녕, 아니오)).isEqualTo(3);
    }

    @Test
    void 안녕과_안내의_자모_거리는_2이다() {
        List<Character> 안녕 = HangulJamo.분해("안녕");
        List<Character> 안내 = HangulJamo.분해("안내");
        assertThat(LevenshteinDistance.거리(안녕, 안내)).isEqualTo(2);
    }
}
