package com.kiobridge.kiobridge.modules.voice.service;

import com.kiobridge.kiobridge.common.web.ApiException;
import com.kiobridge.kiobridge.modules.voice.entity.VoiceCorrectionLog;
import com.kiobridge.kiobridge.modules.voice.repository.VoiceCorrectionLogRepository;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

class VoiceCorrectionLogServiceTest {

    private final VoiceCorrectionLogRepository repository = mock(VoiceCorrectionLogRepository.class);
    private final VoiceCorrectionLogService service = new VoiceCorrectionLogService(repository);

    @Test
    void 평범한_원문은_그대로_저장한다() {
        service.log("YES_NO", "안녕", "NO");

        verify(repository).save(argThat((VoiceCorrectionLog log) ->
            log.getQuestionType().equals("YES_NO")
                && log.getRecognizedText().equals("안녕")
                && log.getCorrectedTo().equals("NO")
        ));
    }

    /*
     * 이 서비스는 인증 없이 열린 POST /api/v1/voice/correction-log 의 종점이다.
     * 프론트가 이미 개인정보처럼 보이는 말을 걸러 보내지만(voicecorrection.ts),
     * 이 경로를 프론트 없이 직접 부르면 그 문을 건너뛴다 — 여기서도 막혀야
     * 실제로 저장되지 않는다.
     */
    void 거부되고_저장되지_않는다(String recognizedText) {
        assertThatThrownBy(() -> service.log("YES_NO", recognizedText, "NO"))
            .isInstanceOf(ApiException.class)
            .satisfies(e -> assertThat(((ApiException) e).code()).isEqualTo("VOICE_CORRECTION_LOG_PII_LIKE"));

        verify(repository, never()).save(any());
    }

    @Test
    void 전화번호처럼_보이는_원문은_거부되고_저장되지_않는다() {
        거부되고_저장되지_않는다("010-1234-5678 로 다시 걸어주세요");
    }

    @Test
    void 주민번호처럼_보이는_원문은_거부되고_저장되지_않는다() {
        거부되고_저장되지_않는다("900101-1234567");
    }

    @Test
    void 주소처럼_보이는_원문은_거부되고_저장되지_않는다() {
        거부되고_저장되지_않는다("역삼로 12길 5");
    }
}
