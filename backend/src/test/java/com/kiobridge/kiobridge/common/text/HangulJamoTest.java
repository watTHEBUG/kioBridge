package com.kiobridge.kiobridge.common.text;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class HangulJamoTest {

    @Test
    void 받침없는_음절을_초성_중성으로_푼다() {
        assertThat(HangulJamo.분해("아니오"))
            .containsExactly('ㅇ', 'ㅏ', 'ㄴ', 'ㅣ', 'ㅇ', 'ㅗ');
    }

    @Test
    void 받침있는_음절을_초성_중성_종성으로_푼다() {
        assertThat(HangulJamo.분해("안녕"))
            .containsExactly('ㅇ', 'ㅏ', 'ㄴ', 'ㄴ', 'ㅕ', 'ㅇ');
    }

    @Test
    void 한글이_아닌_글자는_그대로_옮긴다() {
        assertThat(HangulJamo.분해("no1")).containsExactly('n', 'o', '1');
    }

    @Test
    void 한글과_비한글이_섞여도_각각_처리한다() {
        assertThat(HangulJamo.분해("안녕?"))
            .containsExactly('ㅇ', 'ㅏ', 'ㄴ', 'ㄴ', 'ㅕ', 'ㅇ', '?');
    }

    @Test
    void 빈_문자열은_빈_목록이다() {
        assertThat(HangulJamo.분해("")).isEmpty();
    }
}
