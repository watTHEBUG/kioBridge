package com.kiobridge.kiobridge.modules.voice.service;

import com.kiobridge.kiobridge.common.text.HangulJamo;
import com.kiobridge.kiobridge.common.text.LevenshteinDistance;
import com.kiobridge.kiobridge.modules.voice.entity.PhoneticConfusionAnchor;
import com.kiobridge.kiobridge.modules.voice.repository.PhoneticConfusionAnchorRepository;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * "신뢰도는 높게 나왔는데(=자신없나() 를 통과했는데) 엉뚱한 글자로 인식된"
 * 경우를 구제하는 2차 방어선.
 *
 * ── 왜 전체 어휘가 아니라 curated anchor 목록만 보는가 ──────────────────────
 *
 * 처음엔 "입력 텍스트가 아니오 계열과 자모 거리가 가까우면 NO로 본다"는
 * 느슨한 문턱값을 생각했다. 그런데 실제 앱 어휘("포장"/"매장")와 흔한 필러
 * ("아이고"/"안내"/"아까")가 참양성 사례("안녕")와 비슷하거나 더 가까운
 * 거리에 몰려 있어서(자세한 수치는 PhoneticConfusionAnchor 클래스 주석 대신
 * 이 서비스의 단위테스트에 남긴다), 느슨한 문턱값은 이 단어들을 잘못
 * NO로 뒤집을 위험이 있었다.
 *
 * 그래서 비교 대상을 "이미 사람이 확인한 오인식 문자열"(anchor)로 좁히고,
 * 그 anchor 로부터의 자모 편집거리만 아주 타이트하게(1까지만) 허용한다 —
 * "안녕"·"안뇽"·"안녕?" 처럼 Whisper 결과의 아주 작은 표기 흔들림만 흡수하고,
 * "안내"(거리 2)조차 걸러낸다. anchor 목록이 넓어질 때도 이 좁은 허용치는
 * 그대로 유지해야 안전하다.
 */
@Service
public class PhoneticYesNoMatchingService {

    /**
     * anchor 원문으로부터 자모 편집거리로 몇 칸까지 같은 오인식으로 볼지.
     * "안녕"(anchor) 기준 실측: "안뇽"/"안녕?" 등 표기 흔들림 = 1,
     * 반면 "안내" = 2, "아이고"/"아까" = 4, "포장"/"매장" = 5 로 뚜렷이
     * 떨어져 있어 1이 안전하다(PhoneticYesNoMatchingServiceUnitTest 참고).
     */
    private static final int 최대허용거리 = 1;

    private final PhoneticConfusionAnchorRepository repository;

    public PhoneticYesNoMatchingService(PhoneticConfusionAnchorRepository repository) {
        this.repository = repository;
    }

    public PhoneticYesNoMatchResult match(String text) {
        if (text == null || text.isBlank()) {
            return PhoneticYesNoMatchResult.noMatch();
        }

        List<Character> 입력자모 = HangulJamo.분해(text);

        PhoneticConfusionAnchor 최근접앵커 = null;
        int 최소거리 = Integer.MAX_VALUE;

        for (PhoneticConfusionAnchor anchor : repository.findAll()) {
            List<Character> 앵커자모 = HangulJamo.분해(anchor.getMisheardText());
            int 거리 = LevenshteinDistance.거리(입력자모, 앵커자모);
            if (거리 < 최소거리) {
                최소거리 = 거리;
                최근접앵커 = anchor;
            }
        }

        if (최근접앵커 == null || 최소거리 > 최대허용거리) {
            return PhoneticYesNoMatchResult.noMatch();
        }

        return new PhoneticYesNoMatchResult(
            true, 최근접앵커.getCorrectedTo(), 최근접앵커.getMisheardText(), 최소거리
        );
    }
}
