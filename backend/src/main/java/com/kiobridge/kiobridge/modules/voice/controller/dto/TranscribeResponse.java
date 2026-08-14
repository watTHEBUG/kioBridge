package com.kiobridge.kiobridge.modules.voice.controller.dto;

/**
 * POST /api/v1/voice/transcribe 응답.
 * 인식된 글만 담는다 — 보낸 오디오는 어디에도 저장하지 않는다(킷 문서
 * PARTICIPANT_IDEA_CATALOG.md "음성 원본을 서버에 저장하지 마세요. 인식 결과만
 * 씁니다").
 */
public record TranscribeResponse(String text) {}
