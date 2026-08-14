package com.kiobridge.kiobridge.modules.voice.controller;

import com.kiobridge.kiobridge.modules.voice.controller.dto.TranscribeResponse;
import com.kiobridge.kiobridge.modules.voice.service.VoiceTranscriptionService;
import org.springframework.web.bind.annotation.PostMapping;
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

    public VoiceController(VoiceTranscriptionService voiceTranscriptionService) {
        this.voiceTranscriptionService = voiceTranscriptionService;
    }

    @PostMapping(value = "/transcribe", consumes = "multipart/form-data")
    public TranscribeResponse transcribe(
        @RequestParam("audio") MultipartFile audio,
        @RequestParam(value = "language", required = false) String language
    ) {
        String text = voiceTranscriptionService.transcribe(audio, language);
        return new TranscribeResponse(text);
    }
}
