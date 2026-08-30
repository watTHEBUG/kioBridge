package com.kiobridge.kiobridge.modules.voice.controller;

import com.kiobridge.kiobridge.modules.voice.controller.dto.TranscribeResponse;
import com.kiobridge.kiobridge.modules.voice.controller.dto.VoiceCorrectionLogRequest;
import com.kiobridge.kiobridge.modules.voice.service.VoiceCorrectionLogService;
import com.kiobridge.kiobridge.modules.voice.service.VoiceTranscriptionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * 음성을 글로 바꾸는 자리.
 *
 * frontend/src/api/listen.ts 의 브라우저 내장 인식이 일부 기기·언어(특히
 * 한국어)에서 응답이 아예 없어서 우회로 만들었다 — 자세한 사연은
 * VoiceTranscriptionService 주석 참고.
 */
@RestController
@RequestMapping("/api/v1/voice")
public class VoiceController {

    private final VoiceTranscriptionService voiceTranscriptionService;
    private final VoiceCorrectionLogService voiceCorrectionLogService;

    public VoiceController(
        VoiceTranscriptionService voiceTranscriptionService,
        VoiceCorrectionLogService voiceCorrectionLogService
    ) {
        this.voiceTranscriptionService = voiceTranscriptionService;
        this.voiceCorrectionLogService = voiceCorrectionLogService;
    }

    @PostMapping(value = "/transcribe", consumes = "multipart/form-data")
    public TranscribeResponse transcribe(
        @RequestParam("audio") MultipartFile audio,
        @RequestParam(value = "language", required = false) String language
    ) {
        String text = voiceTranscriptionService.transcribe(audio, language);
        return new TranscribeResponse(text);
    }

    /**
     * POST /api/v1/voice/correction-log — 음성 인식이 못 맞춰서 사람이 손으로
     * 고친 순간을 남긴다. 자동으로 판정 규칙을 바꾸지 않는다 —
     * VoiceCorrectionLog 클래스 주석 참고. 응답 본문이 없어도 되는 fire-and-forget
     * 성격이라 202를 돌려준다.
     */
    @PostMapping("/correction-log")
    public ResponseEntity<Void> logCorrection(@Valid @RequestBody VoiceCorrectionLogRequest request) {
        voiceCorrectionLogService.log(request.questionType(), request.recognizedText(), request.correctedTo());
        return ResponseEntity.status(HttpStatus.ACCEPTED).build();
    }
}
