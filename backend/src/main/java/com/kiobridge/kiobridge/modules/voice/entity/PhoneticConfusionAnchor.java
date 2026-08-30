package com.kiobridge.kiobridge.modules.voice.entity;

import jakarta.persistence.*;

/**
 * 직접 확인된 "이 오인식 글자는 사실 이 답이다" 쌍 하나.
 *
 * ── 왜 SpicyLevelAnchor 처럼 임베딩(pgvector) 을 안 쓰는가 ──────────────────
 *
 * 맵기 매칭은 사용자가 뭐라 말할지 미리 다 나열할 수 없어서(수십 가지 표현)
 * 임베딩 유사도가 맞는 도구였다. 이 표는 다르다 — 대상이 "실제로 한 번
 * Whisper 가 낸 오인식 글자"뿐이라 개수가 적고, 무엇을 비교할지도 이미
 * VoiceCorrectionLog 로 사람이 검토해서 확정한 값만 들어온다. 그래서 여기서는
 * HangulJamo/LevenshteinDistance 로 충분하고, 벡터 확장(@Profile("vector"))도
 * 필요 없다 — 이 표는 프로필 상관없이 항상 켜져 있다.
 *
 * ── 왜 사람이 먼저 확인한 쌍만 들어오는가 ────────────────────────────────────
 *
 * VoiceCorrectionLog 주석에 적은 것과 같은 이유다: 자동으로 새 쌍을 추가하지
 * 않는다. PhoneticConfusionAnchorSeeder 가 지금 심는 것도 이 세션에서 개발자
 * 도구로 직접 재현해 확인한 "안녕"→NO 하나뿐이다. 새 오인식이 반복된다고
 * 판단되면, 그때 사람이 이 표에 행을 추가한다(자동 학습 아님).
 */
@Entity
@Table(name = "phonetic_confusion_anchors")
public class PhoneticConfusionAnchor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Whisper 가 실제로 낸, 확인된 오인식 글자. 예: "안녕". */
    @Column(name = "misheard_text", nullable = false, unique = true, length = 50)
    private String misheardText;

    /** 그 오인식이 실제로 뜻했던 답("YES"/"NO"). 지금은 YES_NO 질문에서만 쓴다. */
    @Column(name = "corrected_to", nullable = false, length = 16)
    private String correctedTo;

    protected PhoneticConfusionAnchor() {}

    public PhoneticConfusionAnchor(String misheardText, String correctedTo) {
        this.misheardText = misheardText;
        this.correctedTo = correctedTo;
    }

    public Long getId() { return id; }
    public String getMisheardText() { return misheardText; }
    public String getCorrectedTo() { return correctedTo; }
}
