package com.kiobridge.kiobridge.common.text;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/*
 * frontend/src/api/account.test.ts 의 "개인정보같은글" 관련 시험과 같은
 * fixture 를 쓴다 — 두 언어의 정규식이 갈라지면 프론트는 막고 서버는
 * 통과시키는(또는 그 반대) 상황이 생긴다.
 */
class PersonalInfoLikeTest {

    @Test
    void 전화번호_주민번호_주소_모양은_개인정보로_본다() {
        for (String 글 : List.of(
            "010-1234-5678 로 연락 주세요",
            "01012345678",
            "900101-1234567",
            "서울시 강남구 역삼동 123-4 로 보내주세요",
            "역삼로 12길 5",
            "101동 202호"
        )) {
            assertThat(PersonalInfoLike.개인정보같다(글)).as(글).isTrue();
        }
    }

    @Test
    void 주문에_필요한_말이나_짧은_발음구제_후보는_막지_않는다() {
        for (String 글 : List.of(
            "아이스 아메리카노 2개",
            "닭강정 1인분",
            "3000원짜리 세트",
            "얼음 적게, 2개 3000원",
            "12시 30분에 찾으러 갈게요",
            "강남역 앞에서 받을게요",
            "안녕",
            "포장",
            "매장"
        )) {
            assertThat(PersonalInfoLike.개인정보같다(글)).as(글).isFalse();
        }
    }

    @Test
    void 이름은_못_잡는다() {
        // account.ts 의 같은 함수와 같은 한계다 — 모양이 없는 값은 정규식으로 못 가린다.
        assertThat(PersonalInfoLike.개인정보같다("김순자")).isFalse();
    }

    @Test
    void null은_개인정보가_아니다() {
        assertThat(PersonalInfoLike.개인정보같다(null)).isFalse();
    }
}
