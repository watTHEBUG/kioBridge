package com.kiobridge.kiobridge.modules.voice.controller;

import com.kiobridge.kiobridge.modules.voice.controller.dto.VoiceTranscriptionRequest;
import com.kiobridge.kiobridge.modules.voice.controller.dto.VoiceTranscriptionResponse;
import com.kiobridge.kiobridge.modules.voice.service.VoiceTranscriptionService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/voice")
public class VoiceTranscriptionController {

    private final VoiceTranscriptionService service;

    public VoiceTranscriptionController(VoiceTranscriptionService service) {
        this.service = service;
    }

    @PostMapping("/transcriptions")
    public VoiceTranscriptionResponse transcribe(@Valid @RequestBody VoiceTranscriptionRequest request) {
        return new VoiceTranscriptionResponse(service.transcribe(request));
    }
}
