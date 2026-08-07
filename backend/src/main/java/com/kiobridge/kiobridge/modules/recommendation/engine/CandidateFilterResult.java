package com.kiobridge.kiobridge.modules.recommendation.engine;

import com.kiobridge.kiobridge.contracts.Candidate;
import com.kiobridge.kiobridge.contracts.ExcludedCandidate;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * STEP4 filterCandidates 의 결과.
 *
 * eligibleCandidates — 살아남은 후보. 그대로 STEP5(recommend)로 넘긴다.
 * excludedCandidates — BLOCK 규칙 위반으로 제외된 후보. Recommendation.excludedCandidates()에 그대로 담는다.
 * warningsByCandidateId — WARN 규칙 위반 결과만 candidateId별로 모은 것. 후보를 제외하진 않지만
 *                          STEP5 점수 계산(scoreBreakdown)이나 STEP6 설명(recommendationReasons/unmetConditions)에 쓴다.
 * requiresReconfirmation — 하나라도 RECONFIRM이 나오면 true. Recommendation.requiresReconfirmation()으로 그대로 전달한다.
 */
public record CandidateFilterResult(
    List<Candidate> eligibleCandidates,
    List<ExcludedCandidate> excludedCandidates,
    Map<String, List<RuleEvaluationResult>> warningsByCandidateId,
    boolean requiresReconfirmation
) {
    public CandidateFilterResult {
        Objects.requireNonNull(eligibleCandidates, "eligibleCandidates는 null일 수 없습니다.");
        Objects.requireNonNull(excludedCandidates, "excludedCandidates는 null일 수 없습니다.");
        Objects.requireNonNull(warningsByCandidateId, "warningsByCandidateId는 null일 수 없습니다.");

        // 방어적 복사: 호출자가 반환된 결과의 리스트/맵을 변경해도 이 레코드 내부 상태는 영향받지 않도록 불변으로 저장한다.
        eligibleCandidates = List.copyOf(eligibleCandidates);
        excludedCandidates = List.copyOf(excludedCandidates);
        warningsByCandidateId = warningsByCandidateId.entrySet().stream()
            .collect(Collectors.toUnmodifiableMap(Map.Entry::getKey, e -> List.copyOf(e.getValue())));
    }
}
