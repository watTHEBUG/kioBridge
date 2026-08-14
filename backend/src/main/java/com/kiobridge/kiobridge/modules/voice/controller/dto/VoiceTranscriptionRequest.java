package com.kiobridge.kiobridge.modules.voice.controller.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record VoiceTranscriptionRequest(
    @NotBlank
    @Size(max = 900_000)
    String audioBase64,

    @NotBlank
    @Pattern(regexp = "audio/(webm|ogg|mp4|mpeg|wav)(;.*)?")
    String mimeType,

    @NotBlank
    @Pattern(regexp = "(ko-KR|en-US)")
    String language
) {}
