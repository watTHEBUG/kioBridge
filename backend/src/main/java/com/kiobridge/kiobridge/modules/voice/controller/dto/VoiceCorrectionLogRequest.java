package com.kiobridge.kiobridge.modules.voice.controller.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * POST /api/v1/voice/correction-log 요청.
 *
 * questionType·correctedTo 를 자유 문자열로 열어 두지 않고 지금 실제로 쓰는
 * 값으로 좁힌다 — 이 표는 사람이 나중에 읽고 판단하는 자료라, 오타나 임의의
 * 값이 섞이면 그 판단이 흐려진다. 새 질문 유형(선택지형 등)이 생기면 이
 * 패턴을 그때 넓힌다.
 */
public record VoiceCorrectionLogRequest(
    @NotBlank
    @Pattern(regexp = "YES_NO", message = "questionType은 YES_NO만 지원합니다.")
    String questionType,

    @NotBlank
    @Size(max = 200)
    String recognizedText,

    @NotBlank
    @Pattern(regexp = "YES|NO", message = "correctedTo는 YES 또는 NO여야 합니다.")
    String correctedTo
) {}
