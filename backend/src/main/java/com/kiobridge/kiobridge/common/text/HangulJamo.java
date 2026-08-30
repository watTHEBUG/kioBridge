package com.kiobridge.kiobridge.common.text;

import java.util.ArrayList;
import java.util.List;

/**
 * 한글 음절을 초성·중성·종성 자모로 쪼갠다.
 *
 * ── 왜 필요한가 ─────────────────────────────────────────────────────────────
 *
 * "아니오"("아니오" 계열 부정어)가 Whisper 에 "안녕"으로 통째로 잘못 들린
 * 사례를 겪었다. 음절(글자) 단위로 거리를 재면 "아니오"와 "안녕"은 완전히
 * 다른 세 글자라 거리가 3(=아예 안 겹침)으로 나온다. 그런데 자모로 풀어보면
 * 다르다 — "아니오"는 ㅇㅏㄴㅣㅇㅗ, "안녕"은 ㅇㅏㄴㄴㅕㅇ이고, **앞 세
 * 자모(ㅇㅏㄴ)가 완전히 같다.** "아니"와 "안"이 소리로는 거의 같다는 뜻이고,
 * 이게 실제 오인식의 원인에 가깝다. 음절 단위 비교로는 이 근접성 자체가
 * 안 보인다.
 *
 * ── 좁게 쓴다 ────────────────────────────────────────────────────────────
 *
 * 이 클래스는 "글자를 자모로 푼다"까지만 한다. 그 자모열로 무엇을 판단할지
 * (거리 계산·문턱값·어느 후보와 비교할지)는 이 클래스가 모른다 — 그건
 * PhoneticYesNoMatchingService 의 몫이다. 책임을 나누는 이유는
 * RuleEvaluatorImpl 이 값 추출(RuleValueResolver)과 판정을 나눈 것과 같다.
 */
public final class HangulJamo {

    private HangulJamo() {}

    private static final char[] 초성 = {
        'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ',
        'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
    };

    private static final char[] 중성 = {
        'ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ',
        'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ',
    };

    /** 인덱스 0은 "종성 없음"이다. */
    private static final char[] 종성 = {
        0, 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ',
        'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ',
        'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
    };

    private static final int 음절시작 = 0xAC00; // '가'
    private static final int 음절끝 = 0xD7A3;   // '힣'
    private static final int 중성수 = 21;
    private static final int 종성수 = 28;

    /**
     * 완성형 한글 음절만 초성·중성·(있으면)종성으로 푼다. 한글이 아닌 글자
     * (숫자·영어·이미 낱자인 자모·공백 등)는 그대로 한 칸으로 옮긴다 — 그래야
     * "no"·"OK" 처럼 섞인 입력도 거리 비교에서 죽지 않는다.
     */
    public static List<Character> 분해(String 글) {
        List<Character> 결과 = new ArrayList<>(글.length() * 2);
        for (int i = 0; i < 글.length(); i++) {
            char c = 글.charAt(i);
            if (c < 음절시작 || c > 음절끝) {
                결과.add(c);
                continue;
            }
            int 코드 = c - 음절시작;
            int 초 = 코드 / (중성수 * 종성수);
            int 중 = (코드 % (중성수 * 종성수)) / 종성수;
            int 종 = 코드 % 종성수;
            결과.add(초성[초]);
            결과.add(중성[중]);
            if (종 != 0) 결과.add(종성[종]);
        }
        return 결과;
    }
}
