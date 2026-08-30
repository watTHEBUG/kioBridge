package com.kiobridge.kiobridge.modules.voice.service;

import com.kiobridge.kiobridge.modules.voice.entity.VoiceCorrectionLog;
import com.kiobridge.kiobridge.modules.voice.repository.VoiceCorrectionLogRepository;
import org.springframework.stereotype.Service;

/**
 * 사람이 손으로 고친 정정을 그대로 쌓기만 한다.
 *
 * 자동으로 예아니오()/신뢰도 게이트의 판정 규칙을 바꾸지 않는다 — 이유는
 * VoiceCorrectionLog 클래스 주석에 있다. 이 서비스가 하는 일은 "누가 나중에
 * 봐도 되는 자리에 사실을 남긴다"까지다.
 */
@Service
public class VoiceCorrectionLogService {

    private final VoiceCorrectionLogRepository repository;

    public VoiceCorrectionLogService(VoiceCorrectionLogRepository repository) {
        this.repository = repository;
    }

    public void log(String questionType, String recognizedText, String correctedTo) {
        repository.save(new VoiceCorrectionLog(questionType, recognizedText, correctedTo));
    }
}
