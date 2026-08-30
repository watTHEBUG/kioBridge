package com.kiobridge.kiobridge.modules.voice.entity;

import jakarta.persistence.*;

import java.time.Instant;

/**
 * 음성 인식이 놓친 것을, 사람이 손으로 고친 순간과 묶어 남긴다.
 *
 * ── 왜 이 표가 필요한가 ─────────────────────────────────────────────────────
 *
 * "아니오" 라고 말했는데 Whisper 가 "안녕"으로 통째로 잘못 들은 사례를 겪었다.
 * VoiceTranscriptionService 의 신뢰도 게이트(자신없나())가 지금은 그런 경우를
 * 상당수 걸러내지만, 임계값은 어림값이다. 실제로 어떤 오인식이 반복되는지
 * 알아야 임계값도, 힌트 어휘도 다시 잡을 수 있다.
 *
 * ── 자동으로 아니오 로 학습시키지 않는다 ─────────────────────────────────────
 *
 * 자동 반영은 하지 않기로 했다 — "안녕" 이 한 번 아니오 의 오인식이었다고 해서
 * 다음에도 항상 그렇다는 보장이 없고(확률적 오류라 재현이 안 될 수도 있다),
 * 잘못된 정정 한 번이 전체 사용자의 판정을 영구히 오염시킬 위험이 있다. 이
 * 표는 사람이 나중에 들여다보고 "이 오인식이 반복되네" 싶을 때 힌트 어휘나
 * 임계값을 손으로 고치는 근거 자료일 뿐이다 — 예아니오()/신뢰도 게이트가
 * "모르면 되묻는다" 는 원칙 그대로, 이 표도 "모르면 자동으로 안 고친다".
 *
 * ── 담는 것 ──────────────────────────────────────────────────────────────
 *
 * recognizedText 는 Whisper 가 실제로 돌려준 글이다. 이 앱은 실제 개인정보를
 * 받지도 저장하지도 않는다고 약속하므로, 여기 오는 것도 프론트가 이미
 * 개인정보처럼 보이는 말을 걸러낸 뒤의 값이어야 한다(frontend/src/api/
 * voicecorrection.ts). 오디오 원본은 여기에도, 어디에도 남기지 않는다.
 */
@Entity
@Table(name = "voice_correction_log")
public class VoiceCorrectionLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 지금은 "YES_NO" 하나뿐이다. 선택지 형(말에서고르기)까지 넓히면 값이 늘어난다. */
    @Column(name = "question_type", nullable = false, length = 32)
    private String questionType;

    /** Whisper 가 실제로 돌려준 글. 못 맞춘 원인을 나중에 사람이 읽어 보는 자리다. */
    @Column(name = "recognized_text", nullable = false, length = 200)
    private String recognizedText;

    /** 사용자가 음성 인식 직후 손으로 고른 값("YES"/"NO"). */
    @Column(name = "corrected_to", nullable = false, length = 16)
    private String correctedTo;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected VoiceCorrectionLog() {}

    public VoiceCorrectionLog(String questionType, String recognizedText, String correctedTo) {
        this.questionType = questionType;
        this.recognizedText = recognizedText;
        this.correctedTo = correctedTo;
        this.createdAt = Instant.now();
    }

    public Long getId() { return id; }
    public String getQuestionType() { return questionType; }
    public String getRecognizedText() { return recognizedText; }
    public String getCorrectedTo() { return correctedTo; }
    public Instant getCreatedAt() { return createdAt; }
}
