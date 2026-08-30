package com.kiobridge.kiobridge.common.text;

import java.util.regex.Pattern;

/**
 * 전화번호·주민등록번호·주소처럼 "모양이 있는" 개인정보를 가려낸다.
 *
 * frontend/src/api/account.ts 의 개인정보같은글() 을 그대로 옮겼다(세 정규식
 * 전부 동일). 그 함수의 문에서도 적었듯, 이 앱은 실제 개인정보를 받지도
 * 저장하지도 않는다고 약속했다 — 그런데 그 문이 프론트 한 곳에만 있었다.
 *
 * ── 왜 서버에도 같은 문이 필요한가 ───────────────────────────────────────────
 *
 * 이 검사를 쓰는 두 경로(POST /api/v1/voice/correction-log,
 * POST /internal/voice/phonetic-yes-no)는 인증 없이 열려 있다. 프론트를
 * 거치지 않고 이 경로를 직접 부르면 프론트 쪽 개인정보같은글() 검사를
 * 통째로 건너뛴다 — 브라우저 쪽 검사는 이 화면을 쓰는 사람을 돕는 것이지,
 * 이 엔드포인트를 지키는 것이 아니다. 서버 경계에서도 같은 모양을 본다.
 *
 * ── 이 검사가 무엇을 하고 무엇을 못 하는지 ─────────────────────────────────
 *
 * account.ts 의 같은 함수와 한계가 같다 — 전화번호·주민등록번호·주소처럼
 * 모양이 있는 것만 잡는다. 사람 이름처럼 모양이 없는 값은 못 잡는다.
 * 잡은 척하지 않는다.
 */
public final class PersonalInfoLike {

    private PersonalInfoLike() {}

    private static final Pattern 전화번호꼴 = Pattern.compile("\\d{2,3}[-.\\s]?\\d{3,4}[-.\\s]?\\d{4}");
    private static final Pattern 주민번호꼴 = Pattern.compile("\\d{6}[-.\\s]?[1-4]\\d{6}");
    private static final Pattern 주소꼴 = Pattern.compile(
        "([가-힣]{2,}(시|군|구|읍|면|동|리)\\s*)?[가-힣]{2,}(로|길)\\s*\\d+"
            + "|[가-힣]{2,}(동|리)\\s*\\d+\\s*-\\s*\\d+"
            + "|\\d+\\s*동\\s*\\d+\\s*호"
    );

    public static boolean 개인정보같다(String 글) {
        if (글 == null) return false;
        return 주민번호꼴.matcher(글).find()
            || 전화번호꼴.matcher(글).find()
            || 주소꼴.matcher(글).find();
    }
}
