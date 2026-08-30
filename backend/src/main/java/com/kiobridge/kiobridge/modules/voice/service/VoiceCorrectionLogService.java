package com.kiobridge.kiobridge.modules.voice.service;

import com.kiobridge.kiobridge.common.text.PersonalInfoLike;
import com.kiobridge.kiobridge.common.web.ApiException;
import com.kiobridge.kiobridge.modules.voice.entity.VoiceCorrectionLog;
import com.kiobridge.kiobridge.modules.voice.repository.VoiceCorrectionLogRepository;
import org.springframework.stereotype.Service;

/**
 * 사람이 손으로 고친 정정을 그대로 쌓기만 한다.
 *
 * 자동으로 예아니오()/신뢰도 게이트의 판정 규칙을 바꾸지 않는다 — 이유는
 * VoiceCorrectionLog 클래스 주석에 있다. 이 서비스가 하는 일은 "누가 나중에
 * 봐도 되는 자리에 사실을 남긴다"까지다.
 *
 * recognizedText 는 개인정보처럼 보이면 아예 저장하지 않는다. 프론트가
 * 이미 걸러 보내지만(voicecorrection.ts 의 개인정보같은글), 이 엔드포인트는
 * 인증 없이 열려 있어서 프론트를 거치지 않고 직접 부르면 그 문을 건너뛴다 —
 * 서버 경계에서도 같은 검사를 한 번 더 한다(PersonalInfoLike 주석).
 */
@Service
public class VoiceCorrectionLogService {

    private final VoiceCorrectionLogRepository repository;

    public VoiceCorrectionLogService(VoiceCorrectionLogRepository repository) {
        this.repository = repository;
    }

    public void log(String questionType, String recognizedText, String correctedTo) {
        if (PersonalInfoLike.개인정보같다(recognizedText)) {
            throw new ApiException(
                "VOICE_CORRECTION_LOG_PII_LIKE",
                "recognizedText에 전화번호·주민등록번호·주소처럼 보이는 것이 있어 저장하지 않습니다."
            );
        }
        repository.save(new VoiceCorrectionLog(questionType, recognizedText, correctedTo));
    }
}
