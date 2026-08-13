package com.kiobridge.kiobridge.modules.recommendation;

import com.kiobridge.kiobridge.contracts.Candidate;
import com.kiobridge.kiobridge.contracts.ExcludedCandidate;
import com.kiobridge.kiobridge.contracts.Recommendation;
import com.kiobridge.kiobridge.contracts.input.context.ChickenStoreCapabilities;
import com.kiobridge.kiobridge.contracts.input.context.ChickenStoreFacts;
import com.kiobridge.kiobridge.contracts.input.context.ChickenStoreHardConstraints;
import com.kiobridge.kiobridge.contracts.input.context.ChickenStorePreferences;
import com.kiobridge.kiobridge.contracts.input.context.ChickenStoreSessionContext;
import com.kiobridge.kiobridge.contracts.input.context.ServiceType;
import com.kiobridge.kiobridge.contracts.input.context.SessionIntent;
import com.kiobridge.kiobridge.contracts.input.context.SessionTask;
import com.kiobridge.kiobridge.contracts.input.context.SpicyLevel;
import com.kiobridge.kiobridge.contracts.input.profile.Accessibility;
import com.kiobridge.kiobridge.contracts.input.profile.CanonicalProfile;
import com.kiobridge.kiobridge.contracts.input.profile.CollectionChannel;
import com.kiobridge.kiobridge.contracts.input.profile.Consent;
import com.kiobridge.kiobridge.contracts.input.profile.DataClassification;
import com.kiobridge.kiobridge.contracts.input.profile.Interaction;
import com.kiobridge.kiobridge.contracts.input.profile.PreferredInput;
import com.kiobridge.kiobridge.contracts.input.profile.ProfileSource;
import com.kiobridge.kiobridge.contracts.input.profile.RetentionPolicy;
import com.kiobridge.kiobridge.modules.recommendation.engine.CandidateFilterResult;
import com.kiobridge.kiobridge.modules.recommendation.engine.RuleEvaluationResult;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.data.Offset.offset;

class RecommendationEngineServiceTest {

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");
    // 혼잡도(요일+시간대) 로직과 무관한 기존 테스트들이 실행 시각에 따라 흔들리지 않도록,
    // 평일이지만 점심 러시(11:30~13:00)가 아닌 고정 시각을 기본 서비스에 사용한다.
    // 2026-08-12는 수요일, 15:00 KST = 06:00 UTC.
    private static final Instant NOT_CONGESTED_INSTANT = Instant.parse("2026-08-12T06:00:00Z");
    // 같은 수요일 12:00 KST = 03:00 UTC (점심 러시 한가운데).
    private static final Instant CONGESTED_INSTANT = Instant.parse("2026-08-12T03:00:00Z");
    // 2026-08-15는 토요일, 18:30 KST = 09:30 UTC (저녁 러시 — 평일/주말 공통으로 혼잡 취급).
    private static final Instant WEEKEND_DINNER_RUSH_INSTANT = Instant.parse("2026-08-15T09:30:00Z");
    // 같은 토요일 12:00 KST = 03:00 UTC (주말 점심 — 점심 러시는 평일 전용이라 혼잡 아님).
    private static final Instant WEEKEND_LUNCH_INSTANT = Instant.parse("2026-08-15T03:00:00Z");

    private final RecommendationEngineService service = serviceAt(NOT_CONGESTED_INSTANT);

    private static RecommendationEngineService serviceAt(Instant instant) {
        return new RecommendationEngineService(Clock.fixed(instant, KST));
    }

    @Test
    void 적격_후보가_없으면_추천ID는_null이고_이유는_최소_1개다() {
        CandidateFilterResult filterResult = new CandidateFilterResult(List.of(), List.of(), Map.of(), Map.of(), Map.of());

        Recommendation recommendation = service.recommend(filterResult, sessionContext(null), profile());

        assertThat(recommendation.recommendedCandidateId()).isNull();
        assertThat(recommendation.alternativeCandidateIds()).isEmpty();
        assertThat(recommendation.recommendationReasons()).isNotEmpty();
        assertThat(recommendation.confidence()).isEqualTo(0.0);
        assertThat(recommendation.requiresReconfirmation()).isFalse();
    }

    @Test
    void WARN이_없는_후보가_1순위로_선정되고_대안은_점수순으로_담긴다() {
        Candidate clean = candidate("CHICKEN-CLEAN", 6000.0, List.of("HOT"));
        Candidate oneWarn = candidate("CHICKEN-ONE-WARN", 6000.0, List.of("HOT"));
        Candidate twoWarns = candidate("CHICKEN-TWO-WARNS", 6000.0, List.of("MILD"));

        Map<String, List<RuleEvaluationResult>> warnings = Map.of(
            oneWarn.candidateId(), List.of(serviceTypeMismatch()),
            twoWarns.candidateId(), List.of(serviceTypeMismatch(), spicyLevelMismatch())
        );
        // clean/oneWarn은 WARN이 없는 항목에 대해 실제로 PASS까지 났다고 가정한다 (사용자가 TAKE_OUT/HOT을
        // 명시했고 후보도 이를 지원함). PASS가 없으면 "WARN 없음"을 "일치"로 오인하는 버그가 재현된다.
        Map<String, List<RuleEvaluationResult>> passes = Map.of(
            clean.candidateId(), List.of(serviceTypePass(), spicyLevelPass()),
            oneWarn.candidateId(), List.of(spicyLevelPass())
        );

        CandidateFilterResult filterResult =
            new CandidateFilterResult(List.of(clean, oneWarn, twoWarns), List.of(), warnings, Map.of(), passes);

        Recommendation recommendation = service.recommend(filterResult, sessionContext(null), profile());

        assertThat(recommendation.recommendedCandidateId()).isEqualTo("CHICKEN-CLEAN");
        assertThat(recommendation.alternativeCandidateIds())
            .containsExactly("CHICKEN-ONE-WARN", "CHICKEN-TWO-WARNS");
        assertThat(recommendation.confidence()).isCloseTo(0.89, offset(0.0001));
        assertThat(recommendation.requiresReconfirmation()).isFalse();
        assertThat(recommendation.recommendationReasons()).containsExactly(
            "선호하신 이용 방식과 일치하는 메뉴라 우선 추천드립니다.",
            "선호하신 맵기와 맞는 메뉴라 우선 추천드립니다."
        );
    }

    @Test
    void WARN도_PASS도_없이_SKIPPED로_끝난_항목은_일치_보너스나_일치_사유를_받지_않는다() {
        // 사용자가 이 항목에 대해 아무 선호도 밝히지 않은 경우(중립값, absentMeans=NONE, unknownPolicy=IGNORE/ALLOW 등)
        // RuleEvaluatorImpl은 WARN도 PASS도 안 남기고 SKIPPED로 끝낸다. STEP4가 이걸 그대로 전달하면
        // (= warningsByCandidateId/passesByCandidateId 둘 다 비어있으면) "일치"라고 단정하면 안 된다.
        Candidate onlyCandidate = candidate("CHICKEN-NEUTRAL", 6000.0, List.of("HOT"));

        CandidateFilterResult filterResult =
            new CandidateFilterResult(List.of(onlyCandidate), List.of(), Map.of(), Map.of(), Map.of());

        Recommendation recommendation = service.recommend(filterResult, sessionContext(null), profile());

        assertThat(recommendation.scoreBreakdown().get("serviceTypeMatch")).isEqualTo(0.0);
        assertThat(recommendation.scoreBreakdown().get("spicyLevelMatch")).isEqualTo(0.0);
        assertThat(recommendation.scoreBreakdown().get("boneTypeMatch")).isEqualTo(0.0);
        assertThat(recommendation.scoreBreakdown().get("cupOptionMatch")).isEqualTo(0.0);
        assertThat(recommendation.scoreBreakdown().get("crowdingContextScore")).isEqualTo(0.0);
        assertThat(recommendation.recommendationReasons())
            .containsExactly("남은 후보 중 조건에 가장 가까운 메뉴라 추천드립니다.");
    }

    @Test
    void 추천_후보_본인이_RECONFIRM이면_확신도가_낮아지고_재확인이_필요하다() {
        Candidate onlyCandidate = candidate("CHICKEN-UNSURE", 6000.0, List.of("HOT"));

        Map<String, List<RuleEvaluationResult>> reconfirmations =
            Map.of(onlyCandidate.candidateId(), List.of(allergenReconfirm()));

        CandidateFilterResult filterResult =
            new CandidateFilterResult(List.of(onlyCandidate), List.of(), Map.of(), reconfirmations, Map.of());

        Recommendation recommendation = service.recommend(filterResult, sessionContext(null), profile());

        assertThat(recommendation.recommendedCandidateId()).isEqualTo("CHICKEN-UNSURE");
        assertThat(recommendation.confidence()).isCloseTo(0.5, offset(0.0001));
        assertThat(recommendation.requiresReconfirmation()).isTrue();
    }

    @Test
    void 추천_후보가_아닌_대안의_RECONFIRM은_결과에_영향을_주지_않는다() {
        Candidate best = candidate("CHICKEN-A", 6000.0, List.of("HOT"));
        Candidate worse = candidate("CHICKEN-B", 6000.0, List.of("HOT"));

        Map<String, List<RuleEvaluationResult>> warnings = Map.of(worse.candidateId(), List.of(serviceTypeMismatch()));
        Map<String, List<RuleEvaluationResult>> reconfirmations = Map.of(worse.candidateId(), List.of(allergenReconfirm()));
        // best는 두 항목 다, worse는 WARN 안 뜬 맵기만 실제로 PASS났다고 가정한다 (둘 다 HOT을 지원하니까).
        // 이게 없으면 두 후보 점수 격차가 좁아져서 confidence가 재확인 임계값(0.6) 밑으로 떨어져버린다.
        Map<String, List<RuleEvaluationResult>> passes = Map.of(
            best.candidateId(), List.of(serviceTypePass(), spicyLevelPass()),
            worse.candidateId(), List.of(spicyLevelPass())
        );

        CandidateFilterResult filterResult =
            new CandidateFilterResult(List.of(best, worse), List.of(), warnings, reconfirmations, passes);

        Recommendation recommendation = service.recommend(filterResult, sessionContext(null), profile());

        assertThat(recommendation.recommendedCandidateId()).isEqualTo("CHICKEN-A");
        assertThat(recommendation.requiresReconfirmation()).isFalse();
    }

    @Test
    void survivors가_1개면_WARN_개수_기반으로_확신도를_계산한다() {
        Candidate onlyCandidate = candidate("CHICKEN-SOLO", 6000.0, List.of("HOT"));

        Map<String, List<RuleEvaluationResult>> warnings = Map.of(onlyCandidate.candidateId(), List.of(serviceTypeMismatch()));

        CandidateFilterResult filterResult =
            new CandidateFilterResult(List.of(onlyCandidate), List.of(), warnings, Map.of(), Map.of());

        Recommendation recommendation = service.recommend(filterResult, sessionContext(null), profile());

        assertThat(recommendation.confidence()).isCloseTo(0.65, offset(0.0001));
        assertThat(recommendation.requiresReconfirmation()).isFalse();
    }

    @Test
    void excludedCandidates는_그대로_Recommendation에_전달된다() {
        Candidate eligible = candidate("CHICKEN-OK", 6000.0, List.of("HOT"));
        ExcludedCandidate excluded =
            new ExcludedCandidate("CHICKEN-PEANUT", "ALLERGEN_CONFLICT", null, "땅콩 알레르기와 겹쳐 제외");

        CandidateFilterResult filterResult =
            new CandidateFilterResult(List.of(eligible), List.of(excluded), Map.of(), Map.of(), Map.of());

        Recommendation recommendation = service.recommend(filterResult, sessionContext(null), profile());

        assertThat(recommendation.excludedCandidates()).containsExactly(excluded);
    }

    @Test
    void 뼈타입_선호와_일치하면_점수_보너스와_일치_사유를_받는다() {
        // v5.1.6 RC5부터 CHICKEN_BONE_TYPE_PREFERENCE가 CANDIDATE-scope WARN 규칙으로 추가됐다.
        // serviceType/spicyLevel과 동일하게 PASS가 실제로 나야 "일치" 보너스를 준다.
        Candidate boneless = candidate("CHICKEN-BONELESS", 6000.0, List.of("HOT"));

        Map<String, List<RuleEvaluationResult>> passes =
            Map.of(boneless.candidateId(), List.of(boneTypePass()));

        CandidateFilterResult filterResult =
            new CandidateFilterResult(List.of(boneless), List.of(), Map.of(), Map.of(), passes);

        Recommendation recommendation = service.recommend(filterResult, sessionContext(null), profile());

        assertThat(recommendation.scoreBreakdown().get("boneTypeMatch")).isEqualTo(0.5);
        assertThat(recommendation.recommendationReasons()).contains("선호하신 뼈/순살과 일치하는 메뉴라 우선 추천드립니다.");
    }

    @Test
    void 뼈타입_선호와_불일치하면_감점되고_불만족_조건에_반영된다() {
        Candidate boneOnly = candidate("CHICKEN-BONE-ONLY", 6000.0, List.of("HOT"));

        Map<String, List<RuleEvaluationResult>> warnings =
            Map.of(boneOnly.candidateId(), List.of(boneTypeMismatch()));

        CandidateFilterResult filterResult =
            new CandidateFilterResult(List.of(boneOnly), List.of(), warnings, Map.of(), Map.of());

        Recommendation recommendation = service.recommend(filterResult, sessionContext(null), profile());

        assertThat(recommendation.scoreBreakdown().get("boneTypeMatch")).isEqualTo(-0.15);
        assertThat(recommendation.unmetConditions()).contains("선호하신 뼈/순살과 다릅니다.");
    }

    @Test
    void 컵옵션_선호와_일치하면_점수_보너스와_일치_사유를_받는다() {
        // v5.1.6 RC5부터 CHICKEN_CUP_OPTION_PREFERENCE도 boneType과 동일한 구조의 CANDIDATE-scope
        // WARN 규칙으로 추가됐다. boneType과 동일한 hasWarning→penalty; else hasPass→bonus 패턴을 따른다.
        Candidate cupOk = candidate("CHICKEN-CUP-OK", 6000.0, List.of("HOT"));

        Map<String, List<RuleEvaluationResult>> passes =
            Map.of(cupOk.candidateId(), List.of(cupOptionPass()));

        CandidateFilterResult filterResult =
            new CandidateFilterResult(List.of(cupOk), List.of(), Map.of(), Map.of(), passes);

        Recommendation recommendation = service.recommend(filterResult, sessionContext(null), profile());

        assertThat(recommendation.scoreBreakdown().get("cupOptionMatch")).isEqualTo(0.5);
        assertThat(recommendation.recommendationReasons()).contains("선호하신 컵 옵션과 일치하는 메뉴라 우선 추천드립니다.");
    }

    @Test
    void 컵옵션_선호와_불일치하면_감점되고_불만족_조건에_반영된다() {
        Candidate cupMismatch = candidate("CHICKEN-CUP-MISMATCH", 6000.0, List.of("HOT"));

        Map<String, List<RuleEvaluationResult>> warnings =
            Map.of(cupMismatch.candidateId(), List.of(cupOptionMismatch()));

        CandidateFilterResult filterResult =
            new CandidateFilterResult(List.of(cupMismatch), List.of(), warnings, Map.of(), Map.of());

        Recommendation recommendation = service.recommend(filterResult, sessionContext(null), profile());

        assertThat(recommendation.scoreBreakdown().get("cupOptionMatch")).isEqualTo(-0.15);
        assertThat(recommendation.unmetConditions()).contains("선호하신 컵 옵션과 다릅니다.");
    }

    @Test
    void 직원_도움을_선호하면_점수엔_영향_없이_안내_문구만_추가된다() {
        Candidate onlyCandidate = candidate("CHICKEN-STAFF", 6000.0, List.of("HOT"));

        CandidateFilterResult filterResult =
            new CandidateFilterResult(List.of(onlyCandidate), List.of(), Map.of(), Map.of(), Map.of());

        Recommendation recommendation =
            service.recommend(filterResult, sessionContext(null), profile(true));

        assertThat(recommendation.recommendationReasons())
            .contains("직원 도움을 선호하시는 것으로 확인돼, 필요하시면 언제든 직원을 불러드릴게요.");
        // 점수엔 영향 없어야 한다 — 선호 미표시(neutral) 케이스와 동일한 배점.
        assertThat(recommendation.scoreBreakdown().get("serviceTypeMatch")).isEqualTo(0.0);
        assertThat(recommendation.scoreBreakdown().get("spicyLevelMatch")).isEqualTo(0.0);
    }

    @Test
    void 적격_후보가_없어도_직원_도움_선호면_안내_문구가_추가된다() {
        CandidateFilterResult filterResult = new CandidateFilterResult(List.of(), List.of(), Map.of(), Map.of(), Map.of());

        Recommendation recommendation = service.recommend(filterResult, sessionContext(null), profile(true));

        assertThat(recommendation.recommendationReasons()).containsExactly(
            "조건에 맞는 메뉴를 찾지 못해 추천드릴 항목이 없습니다.",
            "직원 도움을 선호하시는 것으로 확인돼, 필요하시면 언제든 직원을 불러드릴게요."
        );
    }

    @Test
    void 혼잡_시간대에는_포장_지원_후보에_소폭_가산점과_사유가_붙는다() {
        // 평일(수요일) 점심 러시(12:00 KST)로 고정한 서비스 — 매장 API 없이 서버 시계만으로 판단한다.
        Candidate takeOutFriendly = candidate("CHICKEN-TAKEOUT-OK", 6000.0, List.of("HOT"));

        CandidateFilterResult filterResult =
            new CandidateFilterResult(List.of(takeOutFriendly), List.of(), Map.of(), Map.of(), Map.of());

        Recommendation recommendation =
            serviceAt(CONGESTED_INSTANT).recommend(filterResult, sessionContext(null), profile());

        assertThat(recommendation.scoreBreakdown().get("crowdingContextScore")).isEqualTo(0.1);
        assertThat(recommendation.recommendationReasons())
            .contains("지금 시간대가 붐벼서, 매장에서 기다리지 않고 바로 받으실 수 있는 포장 메뉴를 먼저 보여드립니다.");
    }

    @Test
    void 혼잡_시간대여도_포장을_지원하지_않는_후보는_가산점을_받지_않는다() {
        Candidate dineInOnly = new Candidate(
            "CHICKEN-DINE-IN-ONLY", "테스트 후보", "chicken-store", true, "SYNTHETIC_MOCK",
            6000.0, null,
            Map.of("SERVICE_TYPE", List.of("DINE_IN"), "SPICY_LEVEL", List.of("HOT")),
            Map.of(), Map.of(), Map.of()
        );

        CandidateFilterResult filterResult =
            new CandidateFilterResult(List.of(dineInOnly), List.of(), Map.of(), Map.of(), Map.of());

        Recommendation recommendation =
            serviceAt(CONGESTED_INSTANT).recommend(filterResult, sessionContext(null), profile());

        assertThat(recommendation.scoreBreakdown().get("crowdingContextScore")).isEqualTo(0.0);
        assertThat(recommendation.recommendationReasons())
            .doesNotContain("지금 시간대가 붐벼서, 매장에서 기다리지 않고 바로 받으실 수 있는 포장 메뉴를 먼저 보여드립니다.");
    }

    @Test
    void 혼잡_시간대가_아니면_포장_지원_후보라도_가산점과_사유가_없다() {
        Candidate takeOutFriendly = candidate("CHICKEN-TAKEOUT-QUIET", 6000.0, List.of("HOT"));

        CandidateFilterResult filterResult =
            new CandidateFilterResult(List.of(takeOutFriendly), List.of(), Map.of(), Map.of(), Map.of());

        Recommendation recommendation = service.recommend(filterResult, sessionContext(null), profile());

        assertThat(recommendation.scoreBreakdown().get("crowdingContextScore")).isEqualTo(0.0);
        assertThat(recommendation.recommendationReasons())
            .doesNotContain("지금 시간대가 붐벼서, 매장에서 기다리지 않고 바로 받으실 수 있는 포장 메뉴를 먼저 보여드립니다.");
    }

    @Test
    void 저녁_러시는_주말에도_혼잡으로_판단한다() {
        // 치맥 시간대는 평일/주말 공통 — 점심 러시(평일 전용)와 달리 요일 제한이 없다.
        Candidate takeOutFriendly = candidate("CHICKEN-TAKEOUT-DINNER", 6000.0, List.of("HOT"));

        CandidateFilterResult filterResult =
            new CandidateFilterResult(List.of(takeOutFriendly), List.of(), Map.of(), Map.of(), Map.of());

        Recommendation recommendation =
            serviceAt(WEEKEND_DINNER_RUSH_INSTANT).recommend(filterResult, sessionContext(null), profile());

        assertThat(recommendation.scoreBreakdown().get("crowdingContextScore")).isEqualTo(0.1);
        assertThat(recommendation.recommendationReasons())
            .contains("지금 시간대가 붐벼서, 매장에서 기다리지 않고 바로 받으실 수 있는 포장 메뉴를 먼저 보여드립니다.");
    }

    @Test
    void 점심_러시는_주말에는_적용되지_않는다() {
        Candidate takeOutFriendly = candidate("CHICKEN-TAKEOUT-WEEKEND-LUNCH", 6000.0, List.of("HOT"));

        CandidateFilterResult filterResult =
            new CandidateFilterResult(List.of(takeOutFriendly), List.of(), Map.of(), Map.of(), Map.of());

        Recommendation recommendation =
            serviceAt(WEEKEND_LUNCH_INSTANT).recommend(filterResult, sessionContext(null), profile());

        assertThat(recommendation.scoreBreakdown().get("crowdingContextScore")).isEqualTo(0.0);
        assertThat(recommendation.recommendationReasons())
            .doesNotContain("지금 시간대가 붐벼서, 매장에서 기다리지 않고 바로 받으실 수 있는 포장 메뉴를 먼저 보여드립니다.");
    }

    // ------------------------------------------------------------------
    // fixtures
    // ------------------------------------------------------------------

    private RuleEvaluationResult serviceTypeMismatch() {
        return RuleEvaluationResult.fail(
            "CHICKEN_SERVICE_TYPE_PREFERENCE", "WARN", "SERVICE_TYPE_MISMATCH", "TAKE_OUT", List.of("DINE_IN"));
    }

    private RuleEvaluationResult spicyLevelMismatch() {
        return RuleEvaluationResult.fail(
            "CHICKEN_SPICY_LEVEL_PREFERENCE", "WARN", "SPICY_LEVEL_MISMATCH", "HOT", List.of("MILD"));
    }

    private RuleEvaluationResult serviceTypePass() {
        return RuleEvaluationResult.pass(
            "CHICKEN_SERVICE_TYPE_PREFERENCE", "TAKE_OUT", List.of("DINE_IN", "TAKE_OUT"));
    }

    private RuleEvaluationResult spicyLevelPass() {
        return RuleEvaluationResult.pass(
            "CHICKEN_SPICY_LEVEL_PREFERENCE", "HOT", List.of("HOT"));
    }

    private RuleEvaluationResult boneTypeMismatch() {
        return RuleEvaluationResult.fail(
            "CHICKEN_BONE_TYPE_PREFERENCE", "WARN", "BONE_TYPE_MISMATCH", "BONELESS", List.of("BONE"));
    }

    private RuleEvaluationResult boneTypePass() {
        return RuleEvaluationResult.pass(
            "CHICKEN_BONE_TYPE_PREFERENCE", "BONELESS", List.of("BONELESS"));
    }

    private RuleEvaluationResult cupOptionMismatch() {
        return RuleEvaluationResult.fail(
            "CHICKEN_CUP_OPTION_PREFERENCE", "WARN", "CUP_OPTION_MISMATCH", "PAPER_CUP", List.of("NO_CUP"));
    }

    private RuleEvaluationResult cupOptionPass() {
        return RuleEvaluationResult.pass(
            "CHICKEN_CUP_OPTION_PREFERENCE", "PAPER_CUP", List.of("PAPER_CUP"));
    }

    private RuleEvaluationResult allergenReconfirm() {
        return RuleEvaluationResult.reconfirm(
            "CHICKEN_ALLERGEN_HARD_CONSTRAINT", "LOW_CONFIDENCE_RECONFIRMATION_REQUIRED", "UNKNOWN");
    }

    private Candidate candidate(String candidateId, Double price, List<String> spicyLevels) {
        return new Candidate(
            candidateId, "테스트 후보", "chicken-store", true, "SYNTHETIC_MOCK",
            price, null,
            Map.of("SERVICE_TYPE", List.of("DINE_IN", "TAKE_OUT"), "SPICY_LEVEL", spicyLevels),
            Map.of(), Map.of(), Map.of()
        );
    }

    private ChickenStoreSessionContext sessionContext(java.math.BigDecimal maxPriceKrw) {
        return new ChickenStoreSessionContext(
            new SessionIntent(SessionTask.ORDER_FOOD),
            new ChickenStoreFacts(),
            new ChickenStorePreferences(ServiceType.TAKE_OUT, SpicyLevel.HOT, null, null, null),
            new ChickenStoreHardConstraints(List.of(), maxPriceKrw),
            new ChickenStoreCapabilities(),
            Map.of()
        );
    }

    private CanonicalProfile profile() {
        return profile(false);
    }

    private CanonicalProfile profile(boolean staffAssistancePreferred) {
        return new CanonicalProfile(
            "user_test_001",
            "테스트 사용자",
            DataClassification.SYNTHETIC_PROFILE,
            new ProfileSource(CollectionChannel.WEB_FORM, "TEST", Instant.parse("2026-08-01T00:00:00Z")),
            new Accessibility(false, false, false, false, false, false, staffAssistancePreferred),
            new Interaction(PreferredInput.TOUCH, "ko-KR", true),
            new Consent(false, RetentionPolicy.SESSION_ONLY)
        );
    }
}
