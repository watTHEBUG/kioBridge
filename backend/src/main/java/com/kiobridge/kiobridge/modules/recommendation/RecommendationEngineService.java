package com.kiobridge.kiobridge.modules.recommendation;

import com.kiobridge.kiobridge.contracts.Candidate;
import com.kiobridge.kiobridge.contracts.Recommendation;
import com.kiobridge.kiobridge.contracts.input.context.ChickenStoreSessionContext;
import com.kiobridge.kiobridge.contracts.input.context.SpicyLevel;
import com.kiobridge.kiobridge.contracts.input.profile.CanonicalProfile;
import com.kiobridge.kiobridge.modules.recommendation.engine.CandidateFilterResult;
import com.kiobridge.kiobridge.modules.recommendation.engine.RuleEvaluationResult;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

//STEP5~7(recommend / explainRecommendation / buildAlternatives)을 한 곳에서 처리한다.
@Service
public class RecommendationEngineService {

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");
    // 점심 러시는 평일에만 (사무실 점심시간 기준). 저녁 러시(치맥 시간대)는 평일/주말 공통으로 혼잡하다고 가정한다.
    private static final LocalTime LUNCH_RUSH_START = LocalTime.of(11, 30);
    private static final LocalTime LUNCH_RUSH_END = LocalTime.of(13, 0);
    private static final LocalTime DINNER_RUSH_START = LocalTime.of(18, 0);
    private static final LocalTime DINNER_RUSH_END = LocalTime.of(19, 0);

    private final Clock clock;

    public RecommendationEngineService() {
        this(Clock.system(KST));
    }

    // 테스트 전용
    RecommendationEngineService(Clock clock) {
        this.clock = clock;
    }

    private static final String SERVICE_TYPE_MISMATCH_CODE = "SERVICE_TYPE_MISMATCH";
    private static final String SPICY_LEVEL_MISMATCH_CODE = "SPICY_LEVEL_MISMATCH";
    private static final String BONE_TYPE_MISMATCH_CODE = "BONE_TYPE_MISMATCH";
    private static final String CUP_OPTION_MISMATCH_CODE = "CUP_OPTION_MISMATCH";
    private static final String SPICY_LEVEL_OPTION_KEY = "SPICY_LEVEL";
    private static final String SERVICE_TYPE_OPTION_KEY = "SERVICE_TYPE";
    private static final String TAKE_OUT_VALUE = "TAKE_OUT";

    private static final String SERVICE_TYPE_PREFERENCE_RULE_ID = "CHICKEN_SERVICE_TYPE_PREFERENCE";
    private static final String SPICY_LEVEL_PREFERENCE_RULE_ID = "CHICKEN_SPICY_LEVEL_PREFERENCE";
    private static final String BONE_TYPE_PREFERENCE_RULE_ID = "CHICKEN_BONE_TYPE_PREFERENCE";
    private static final String CUP_OPTION_PREFERENCE_RULE_ID = "CHICKEN_CUP_OPTION_PREFERENCE";
    private static final String SERVICE_TYPE_SCORE_KEY = "serviceTypeMatch";
    private static final String SPICY_LEVEL_SCORE_KEY = "spicyLevelMatch";
    private static final String BONE_TYPE_SCORE_KEY = "boneTypeMatch";
    private static final String CUP_OPTION_SCORE_KEY = "cupOptionMatch";
    private static final String PRICE_SCORE_KEY = "priceScore";
    private static final String CROWDING_SCORE_KEY = "crowdingContextScore";

    private static final double PREFERENCE_MATCH_BONUS = 1.0;
    private static final double PREFERENCE_MISMATCH_PENALTY = -0.3;
    private static final double PREFERENCE_PARTIAL_MISMATCH_PENALTY = -0.15;
    private static final double PREFERENCE_UNKNOWN_SCORE = 0.0;
    private static final double BONE_TYPE_MATCH_BONUS = 0.5;
    private static final double BONE_TYPE_MISMATCH_PENALTY = -0.15;
    private static final double CUP_OPTION_MATCH_BONUS = 0.5;
    private static final double CUP_OPTION_MISMATCH_PENALTY = -0.15;
    private static final double CROWDING_TAKE_OUT_BONUS = 0.1;
    private static final int ADJACENT_SPICY_LEVEL_DISTANCE = 1;
    private static final int UNRESOLVABLE_SPICY_LEVEL_DISTANCE = Integer.MAX_VALUE;

    private static final double PRICE_SCORE_WEIGHT = 0.5;

    private static final int MAX_ALTERNATIVE_CANDIDATES = 2;

    private static final double SINGLE_CANDIDATE_BASE_CONFIDENCE = 0.8;
    private static final double SINGLE_CANDIDATE_WARNING_PENALTY = 0.15;
    private static final double CONFIDENCE_BASE_FLOOR = 0.5;
    private static final double CONFIDENCE_GAP_SCALE = 0.3;
    private static final double RECONFIRMATION_CONFIDENCE_CAP = 0.5;
    private static final double LOW_CONFIDENCE_THRESHOLD = 0.6;
    private static final double MIN_CONFIDENCE = 0.0;
    private static final double MAX_CONFIDENCE = 1.0;

    private static final String NO_ELIGIBLE_CANDIDATE_REASON = "조건에 맞는 메뉴를 찾지 못해 추천드릴 항목이 없습니다.";
    private static final String SERVICE_TYPE_MATCH_REASON = "선호하신 이용 방식과 일치하는 메뉴라 우선 추천드립니다.";
    private static final String SPICY_LEVEL_MATCH_REASON = "선호하신 맵기와 맞는 메뉴라 우선 추천드립니다.";
    private static final String BONE_TYPE_MATCH_REASON = "선호하신 뼈/순살과 일치하는 메뉴라 우선 추천드립니다.";
    private static final String CUP_OPTION_MATCH_REASON = "선호하신 컵 옵션과 일치하는 메뉴라 우선 추천드립니다.";
    private static final String BEST_REMAINING_REASON = "남은 후보 중 조건에 가장 가까운 메뉴라 추천드립니다.";
    private static final String RECONFIRMATION_REASON = "일부 정보의 확신도가 낮아 다시 확인이 필요합니다.";
    private static final String STAFF_ASSISTANCE_REASON = "직원 도움을 선호하시는 것으로 확인돼, 필요하시면 언제든 직원을 불러드릴게요.";
    private static final String CROWDING_REASON = "지금 시간대가 붐벼서, 매장에서 기다리지 않고 바로 받으실 수 있는 포장 메뉴를 먼저 보여드립니다.";
    private static final String SERVICE_TYPE_UNMET_TEXT = "선호하신 이용 방식과 다릅니다.";
    private static final String SPICY_LEVEL_UNMET_TEXT = "선호하신 맵기와 다릅니다.";
    private static final String BONE_TYPE_UNMET_TEXT = "선호하신 뼈/순살과 다릅니다.";
    private static final String CUP_OPTION_UNMET_TEXT = "선호하신 컵 옵션과 다릅니다.";
    private static final String RECONFIRMATION_UNMET_TEXT = "확신도가 낮아 재확인이 필요한 항목이 있습니다.";

    private static final Comparator<ScoredCandidate> RANKING_COMPARATOR =
        Comparator.comparingDouble(ScoredCandidate::totalScore).reversed()
            .thenComparing(scored -> Optional.ofNullable(scored.candidate().price()).orElse(Double.MAX_VALUE))
            .thenComparing(scored -> scored.candidate().candidateId());

    private record ScoredCandidate(Candidate candidate, double totalScore, Map<String, Double> scoreBreakdown) {}

    //메인 진입점
    public Recommendation recommend(CandidateFilterResult filterResult, ChickenStoreSessionContext ctx, CanonicalProfile profile) {
        Objects.requireNonNull(filterResult, "filterResult는 null일 수 없습니다.");
        Objects.requireNonNull(ctx, "ctx는 null일 수 없습니다.");
        Objects.requireNonNull(profile, "profile은 null일 수 없습니다.");

        if (filterResult.eligibleCandidates().isEmpty()) {
            return buildNoEligibleCandidateRecommendation(filterResult, profile);
        }

        List<ScoredCandidate> rankedCandidates = filterResult.eligibleCandidates().stream()
            .map(candidate -> scoreCandidate(candidate, ctx, filterResult, clock))
            .sorted(RANKING_COMPARATOR)
            .toList();

        ScoredCandidate topCandidate = rankedCandidates.getFirst();
        String recommendedCandidateId = topCandidate.candidate().candidateId();

        List<RuleEvaluationResult> recommendedWarnings =
            filterResult.warningsByCandidateId().getOrDefault(recommendedCandidateId, List.of());
        List<RuleEvaluationResult> recommendedPasses =
            filterResult.passesByCandidateId().getOrDefault(recommendedCandidateId, List.of());
        boolean recommendedNeedsReconfirmation =
            !filterResult.reconfirmationsByCandidateId().getOrDefault(recommendedCandidateId, List.of()).isEmpty();
        // 혼잡도 보너스가 실제로 이 후보에 반영됐을 때만 이유를 보여준다 (반영 안 됐으면 언급하지 않는다).
        boolean crowdingApplied = topCandidate.scoreBreakdown().getOrDefault(CROWDING_SCORE_KEY, 0.0) > 0.0;

        double confidence = computeConfidence(rankedCandidates, recommendedNeedsReconfirmation);
        boolean requiresReconfirmation = recommendedNeedsReconfirmation || confidence < LOW_CONFIDENCE_THRESHOLD;

        return new Recommendation(
            recommendedCandidateId,
            buildAlternativeCandidateIds(rankedCandidates, recommendedCandidateId),
            filterResult.excludedCandidates(),
            topCandidate.scoreBreakdown(),
            buildRecommendationReasons(recommendedWarnings, recommendedPasses, recommendedNeedsReconfirmation, profile, crowdingApplied),
            buildUnmetConditions(recommendedWarnings, recommendedNeedsReconfirmation),
            confidence,
            requiresReconfirmation
        );
    }

    private static Recommendation buildNoEligibleCandidateRecommendation(CandidateFilterResult filterResult, CanonicalProfile profile) {
        List<String> reasons = new ArrayList<>(List.of(NO_ELIGIBLE_CANDIDATE_REASON));
        if (prefersStaffAssistance(profile)) {
            reasons.add(STAFF_ASSISTANCE_REASON);
        }
        return new Recommendation(
            null,
            List.of(),
            filterResult.excludedCandidates(),
            Map.of(),
            List.copyOf(reasons),
            List.of(),
            MIN_CONFIDENCE,
            false
        );
    }

    // 점수 계산 (STEP5)

    private static ScoredCandidate scoreCandidate(
        Candidate candidate, ChickenStoreSessionContext ctx, CandidateFilterResult filterResult, Clock clock
    ) {
        List<RuleEvaluationResult> warnings =
            filterResult.warningsByCandidateId().getOrDefault(candidate.candidateId(), List.of());
        List<RuleEvaluationResult> passes =
            filterResult.passesByCandidateId().getOrDefault(candidate.candidateId(), List.of());
        Map<String, Double> scoreBreakdown = buildScoreBreakdown(candidate, ctx, warnings, passes, clock);
        double totalScore = scoreBreakdown.values().stream().mapToDouble(Double::doubleValue).sum();
        return new ScoredCandidate(candidate, totalScore, scoreBreakdown);
    }

    private static Map<String, Double> buildScoreBreakdown(
        Candidate candidate, ChickenStoreSessionContext ctx,
        List<RuleEvaluationResult> warnings, List<RuleEvaluationResult> passes, Clock clock
    ) {
        Map<String, Double> scoreBreakdown = new LinkedHashMap<>();
        scoreBreakdown.put(SERVICE_TYPE_SCORE_KEY, scoreServiceType(warnings, passes));
        scoreBreakdown.put(SPICY_LEVEL_SCORE_KEY, scoreSpicyLevel(candidate, ctx, warnings, passes));
        scoreBreakdown.put(BONE_TYPE_SCORE_KEY, scoreBoneType(warnings, passes));
        scoreBreakdown.put(CUP_OPTION_SCORE_KEY, scoreCupOption(warnings, passes));
        scoreBreakdown.put(PRICE_SCORE_KEY, scorePrice(candidate, ctx));
        scoreBreakdown.put(CROWDING_SCORE_KEY, scoreCrowding(candidate, clock));
        return Map.copyOf(scoreBreakdown);
    }

    private static double scoreServiceType(List<RuleEvaluationResult> warnings, List<RuleEvaluationResult> passes) {
        if (hasWarning(warnings, SERVICE_TYPE_MISMATCH_CODE)) {
            return PREFERENCE_MISMATCH_PENALTY;
        }
        return hasPass(passes, SERVICE_TYPE_PREFERENCE_RULE_ID) ? PREFERENCE_MATCH_BONUS : PREFERENCE_UNKNOWN_SCORE;
    }

    private static double scoreSpicyLevel(
        Candidate candidate, ChickenStoreSessionContext ctx,
        List<RuleEvaluationResult> warnings, List<RuleEvaluationResult> passes
    ) {
        if (hasWarning(warnings, SPICY_LEVEL_MISMATCH_CODE)) {
            int distance = spicyLevelDistance(ctx.preferences().spicyLevel(), candidateSupportedSpicyLevels(candidate));
            return distance <= ADJACENT_SPICY_LEVEL_DISTANCE ? PREFERENCE_PARTIAL_MISMATCH_PENALTY : PREFERENCE_MISMATCH_PENALTY;
        }
        return hasPass(passes, SPICY_LEVEL_PREFERENCE_RULE_ID) ? PREFERENCE_MATCH_BONUS : PREFERENCE_UNKNOWN_SCORE;
    }

    private static List<String> candidateSupportedSpicyLevels(Candidate candidate) {
        return candidate.supportedOptions() == null
            ? List.of()
            : candidate.supportedOptions().getOrDefault(SPICY_LEVEL_OPTION_KEY, List.of());
    }

    private static int spicyLevelDistance(SpicyLevel userLevel, List<String> candidateSupportedLevels) {
        if (userLevel == null || isNeutralSpicyLevel(userLevel)) {
            return UNRESOLVABLE_SPICY_LEVEL_DISTANCE;
        }
        return candidateSupportedLevels.stream()
            .map(RecommendationEngineService::parseSpicyLevel)
            .filter(Objects::nonNull)
            .filter(level -> !isNeutralSpicyLevel(level))
            .mapToInt(level -> Math.abs(level.ordinal() - userLevel.ordinal()))
            .min()
            .orElse(UNRESOLVABLE_SPICY_LEVEL_DISTANCE);
    }

    private static SpicyLevel parseSpicyLevel(String rawValue) {
        try {
            return SpicyLevel.valueOf(rawValue);
        } catch (IllegalArgumentException | NullPointerException ex) {
            return null;
        }
    }

    private static boolean isNeutralSpicyLevel(SpicyLevel level) {
        return level == SpicyLevel.NO_PREFERENCE || level == SpicyLevel.UNKNOWN;
    }

    private static double scoreBoneType(List<RuleEvaluationResult> warnings, List<RuleEvaluationResult> passes) {
        if (hasWarning(warnings, BONE_TYPE_MISMATCH_CODE)) {
            return BONE_TYPE_MISMATCH_PENALTY;
        }
        return hasPass(passes, BONE_TYPE_PREFERENCE_RULE_ID) ? BONE_TYPE_MATCH_BONUS : PREFERENCE_UNKNOWN_SCORE;
    }

    private static double scoreCupOption(List<RuleEvaluationResult> warnings, List<RuleEvaluationResult> passes) {
        if (hasWarning(warnings, CUP_OPTION_MISMATCH_CODE)) {
            return CUP_OPTION_MISMATCH_PENALTY;
        }
        return hasPass(passes, CUP_OPTION_PREFERENCE_RULE_ID) ? CUP_OPTION_MATCH_BONUS : PREFERENCE_UNKNOWN_SCORE;
    }

    private static double scorePrice(Candidate candidate, ChickenStoreSessionContext ctx) {
        BigDecimal maxPriceKrw = ctx.hardConstraints().maxPriceKrw();
        if (maxPriceKrw == null || maxPriceKrw.signum() <= 0 || candidate.price() == null) {
            return 0.0;
        }
        double remainingBudgetRatio = 1 - (candidate.price() / maxPriceKrw.doubleValue());
        return PRICE_SCORE_WEIGHT * clamp(remainingBudgetRatio, 0.0, 1.0);
    }

    // hardConstraints/facts/preferences보다 항상 아래 우선순위이므로, 매칭/비매칭 페널티보다 작은
    // 보너스만 주고(CROWDING_TAKE_OUT_BONUS), 순위를 뒤집지 않고 동점권에서만 순서를 조정한다.
    private static double scoreCrowding(Candidate candidate, Clock clock) {
        if (!isCongestedNow(clock)) {
            return PREFERENCE_UNKNOWN_SCORE;
        }
        return candidateSupportsTakeOut(candidate) ? CROWDING_TAKE_OUT_BONUS : PREFERENCE_UNKNOWN_SCORE;
    }

    private static boolean isCongestedNow(Clock clock) {
        ZonedDateTime now = ZonedDateTime.now(clock);
        LocalTime time = now.toLocalTime();

        if (isWithin(time, DINNER_RUSH_START, DINNER_RUSH_END)) {
            return true;
        }
        boolean isWeekday = !isWeekend(now.getDayOfWeek());
        return isWeekday && isWithin(time, LUNCH_RUSH_START, LUNCH_RUSH_END);
    }

    private static boolean isWithin(LocalTime time, LocalTime startInclusive, LocalTime endExclusive) {
        return !time.isBefore(startInclusive) && time.isBefore(endExclusive);
    }

    private static boolean isWeekend(DayOfWeek dayOfWeek) {
        return dayOfWeek == DayOfWeek.SATURDAY || dayOfWeek == DayOfWeek.SUNDAY;
    }

    private static boolean candidateSupportsTakeOut(Candidate candidate) {
        return candidate.supportedOptions() != null
            && candidate.supportedOptions().getOrDefault(SERVICE_TYPE_OPTION_KEY, List.of()).contains(TAKE_OUT_VALUE);
    }

    private static boolean hasWarning(List<RuleEvaluationResult> warnings, String errorCode) {
        return warnings.stream().anyMatch(warning -> errorCode.equals(warning.errorCode()));
    }

    // PASS 결과는 errorCode가 항상 null이라(RuleEvaluationResult.pass() 참고) errorCode가 아닌 ruleId로 찾는다.
    private static boolean hasPass(List<RuleEvaluationResult> passes, String ruleId) {
        return passes.stream().anyMatch(pass -> ruleId.equals(pass.ruleId()));
    }

    private static double clamp(double value, double min, double max) {
        return Math.max(min, Math.min(max, value));
    }

    // confidence / requiresReconfirmation

    private static double computeConfidence(List<ScoredCandidate> rankedCandidates, boolean recommendedNeedsReconfirmation) {
        double baseConfidence = rankedCandidates.size() == 1
            ? computeSingleCandidateConfidence(rankedCandidates.get(0))
            : computeRankingGapConfidence(rankedCandidates.get(0), rankedCandidates.get(1));

        double effectiveConfidence = recommendedNeedsReconfirmation
            ? Math.min(baseConfidence, RECONFIRMATION_CONFIDENCE_CAP)
            : baseConfidence;

        return clamp(effectiveConfidence, MIN_CONFIDENCE, MAX_CONFIDENCE);
    }

    private static double computeSingleCandidateConfidence(ScoredCandidate onlyCandidate) {
        long mismatchCount = onlyCandidate.scoreBreakdown().values().stream().filter(score -> score < 0).count();
        return clamp(SINGLE_CANDIDATE_BASE_CONFIDENCE - mismatchCount * SINGLE_CANDIDATE_WARNING_PENALTY, MIN_CONFIDENCE, MAX_CONFIDENCE);
    }

    private static double computeRankingGapConfidence(ScoredCandidate first, ScoredCandidate second) {
        double scoreGap = first.totalScore() - second.totalScore();
        return clamp(CONFIDENCE_BASE_FLOOR + scoreGap * CONFIDENCE_GAP_SCALE, MIN_CONFIDENCE, MAX_CONFIDENCE);
    }

    // STEP6 recommendationReasons / unmetConditions, STEP7 alternativeCandidateIds

    private static List<String> buildRecommendationReasons(
        List<RuleEvaluationResult> recommendedWarnings, List<RuleEvaluationResult> recommendedPasses,
        boolean needsReconfirmation, CanonicalProfile profile, boolean crowdingApplied
    ) {
        List<String> reasons = new ArrayList<>();
        if (hasPass(recommendedPasses, SERVICE_TYPE_PREFERENCE_RULE_ID)) {
            reasons.add(SERVICE_TYPE_MATCH_REASON);
        }
        if (hasPass(recommendedPasses, SPICY_LEVEL_PREFERENCE_RULE_ID)) {
            reasons.add(SPICY_LEVEL_MATCH_REASON);
        }
        if (hasPass(recommendedPasses, BONE_TYPE_PREFERENCE_RULE_ID)) {
            reasons.add(BONE_TYPE_MATCH_REASON);
        }
        if (hasPass(recommendedPasses, CUP_OPTION_PREFERENCE_RULE_ID)) {
            reasons.add(CUP_OPTION_MATCH_REASON);
        }
        if (reasons.isEmpty()) {
            reasons.add(BEST_REMAINING_REASON);
        }
        if (crowdingApplied) {
            reasons.add(CROWDING_REASON);
        }
        if (needsReconfirmation) {
            reasons.add(RECONFIRMATION_REASON);
        }
        if (prefersStaffAssistance(profile)) {
            reasons.add(STAFF_ASSISTANCE_REASON);
        }
        return List.copyOf(reasons);
    }

    private static boolean prefersStaffAssistance(CanonicalProfile profile) {
        return profile != null && profile.accessibility() != null && profile.accessibility().staffAssistancePreferred();
    }

    private static List<String> buildUnmetConditions(
        List<RuleEvaluationResult> recommendedWarnings, boolean needsReconfirmation
    ) {
        List<String> unmetConditions = recommendedWarnings.stream()
            .map(RecommendationEngineService::describeUnmetWarning)
            .collect(Collectors.toCollection(ArrayList::new));
        if (needsReconfirmation) {
            unmetConditions.add(RECONFIRMATION_UNMET_TEXT);
        }
        return List.copyOf(unmetConditions);
    }

    private static String describeUnmetWarning(RuleEvaluationResult warning) {
        return switch (warning.errorCode()) {
            case SERVICE_TYPE_MISMATCH_CODE -> SERVICE_TYPE_UNMET_TEXT;
            case SPICY_LEVEL_MISMATCH_CODE -> SPICY_LEVEL_UNMET_TEXT;
            case BONE_TYPE_MISMATCH_CODE -> BONE_TYPE_UNMET_TEXT;
            case CUP_OPTION_MISMATCH_CODE -> CUP_OPTION_UNMET_TEXT;
            default -> warning.errorCode();
        };
    }

    private static List<String> buildAlternativeCandidateIds(List<ScoredCandidate> rankedCandidates, String recommendedCandidateId) {
        return rankedCandidates.stream()
            .map(scored -> scored.candidate().candidateId())
            .filter(candidateId -> !candidateId.equals(recommendedCandidateId))
            .limit(MAX_ALTERNATIVE_CANDIDATES)
            .toList();
    }
}
