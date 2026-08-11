package com.kiobridge.kiobridge.orchestrator.service;

import com.kiobridge.kiobridge.contracts.ExecutionPlan;
import com.kiobridge.kiobridge.contracts.ParticipantSubmission;
import com.kiobridge.kiobridge.contracts.Recommendation;
import com.kiobridge.kiobridge.contracts.UserDecision;
import com.kiobridge.kiobridge.contracts.client.SimulationApiClient;
import com.kiobridge.kiobridge.contracts.client.dto.ExecuteResult;
import com.kiobridge.kiobridge.contracts.client.dto.SessionStatusResponse;
import com.kiobridge.kiobridge.contracts.client.dto.ValidationResult;
import com.kiobridge.kiobridge.contracts.input.context.ChickenStoreCapabilities;
import com.kiobridge.kiobridge.contracts.input.context.ChickenStoreFacts;
import com.kiobridge.kiobridge.contracts.input.context.ChickenStoreHardConstraints;
import com.kiobridge.kiobridge.contracts.input.context.ChickenStorePreferences;
import com.kiobridge.kiobridge.contracts.input.context.ChickenStoreSessionContext;
import com.kiobridge.kiobridge.contracts.input.context.SessionIntent;
import com.kiobridge.kiobridge.contracts.input.context.SessionTask;
import com.kiobridge.kiobridge.contracts.input.profile.Accessibility;
import com.kiobridge.kiobridge.contracts.input.profile.CanonicalProfile;
import com.kiobridge.kiobridge.contracts.input.profile.CollectionChannel;
import com.kiobridge.kiobridge.contracts.input.profile.Consent;
import com.kiobridge.kiobridge.contracts.input.profile.DataClassification;
import com.kiobridge.kiobridge.contracts.input.profile.Interaction;
import com.kiobridge.kiobridge.contracts.input.profile.PreferredInput;
import com.kiobridge.kiobridge.contracts.input.profile.ProfileSource;
import com.kiobridge.kiobridge.contracts.input.profile.RetentionPolicy;
import com.kiobridge.kiobridge.modules.executionplan.service.ExecutionPlanResult;
import com.kiobridge.kiobridge.modules.executionplan.service.ExecutionPlanService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class SubmissionOrchestratorTest {

    private static final String SESSION_ID = "SIM-TEST-001";
    private static final String ENVIRONMENT_ID = "chicken-store";
    private static final String TEAM_ID = "WHATTHEBUG";
    private static final String INPUT_CONTRACT_VERSION = "1.0.0";
    private static final String SUBMISSION_VERSION = "1.0.0";

    @Mock
    private ExecutionPlanService executionPlanService;

    @Mock
    private SimulationApiClient simulationApiClient;

    private SubmissionOrchestrator orchestrator;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        orchestrator = new SubmissionOrchestrator(
            executionPlanService, simulationApiClient, TEAM_ID, INPUT_CONTRACT_VERSION, SUBMISSION_VERSION
        );
    }

    @Test
    void 승인_플로우가_ExecutionPlan을_먼저_만들고_ParticipantSubmission을_조립해서_submitAndRun에_넘긴다() {
        ExecutionPlan plan = ExecutionPlan.of(UUID.randomUUID().toString(), List.of());
        Recommendation recommendation = recommendation();
        UserDecision userDecision = UserDecision.approve();
        ChickenStoreSessionContext sessionContext = sessionContext();
        CanonicalProfile profile = profile();
        ExecuteResult expectedResult = new ExecuteResult(true, null, null, new ValidationResult(true, List.of()));

        // approved=true 경로에서는 buildExecutionPlan이 이미 environmentId를 조회해서 돌려주므로,
        // runApprovalFlow는 simulationApiClient.getSession()을 다시 호출하지 않아야 한다(중복 제거 대상).
        when(executionPlanService.buildExecutionPlan(SESSION_ID, recommendation, userDecision, sessionContext))
            .thenReturn(new ExecutionPlanResult(plan, ENVIRONMENT_ID));
        when(executionPlanService.submitAndRun(eq(SESSION_ID), any(ParticipantSubmission.class)))
            .thenReturn(expectedResult);

        ExecuteResult result = orchestrator.runApprovalFlow(
            SESSION_ID, profile, sessionContext, recommendation, userDecision
        );

        assertThat(result).isEqualTo(expectedResult);
        verify(simulationApiClient, never()).getSession(any());

        ArgumentCaptor<ParticipantSubmission> captor = ArgumentCaptor.forClass(ParticipantSubmission.class);
        verify(executionPlanService).submitAndRun(eq(SESSION_ID), captor.capture());

        ParticipantSubmission submission = captor.getValue();
        assertThat(submission.inputContractVersion()).isEqualTo(INPUT_CONTRACT_VERSION);
        assertThat(submission.submissionVersion()).isEqualTo(SUBMISSION_VERSION);
        assertThat(submission.teamId()).isEqualTo(TEAM_ID);
        assertThat(submission.environmentId()).isEqualTo(ENVIRONMENT_ID);
        assertThat(submission.profile()).isEqualTo(profile);
        assertThat(submission.sessionContext()).isEqualTo(sessionContext);
        assertThat(submission.recommendation()).isEqualTo(recommendation);
        assertThat(submission.userDecision()).isEqualTo(userDecision);
        assertThat(submission.executionPlan()).isEqualTo(plan);
    }

    @Test
    void 세션의_environmentId를_못_찾으면_예외를_던지고_submitAndRun을_호출하지_않는다() {
        // approved=false 경로: buildExecutionPlan이 environmentId 조회를 생략하므로(ExecutionPlanResult.environmentId()=null),
        // runApprovalFlow가 직접 Simulation API에 조회해야 하는 fallback 분기를 검증한다.
        Recommendation recommendation = recommendation();
        UserDecision userDecision = UserDecision.reject("사용자가 거절함");
        ChickenStoreSessionContext sessionContext = sessionContext();

        when(executionPlanService.buildExecutionPlan(SESSION_ID, recommendation, userDecision, sessionContext))
            .thenReturn(new ExecutionPlanResult(ExecutionPlan.empty(), null));
        when(simulationApiClient.getSession(SESSION_ID))
            .thenReturn(new SessionStatusResponse(SESSION_ID, null, "WAITING", "NOT_STARTED", "NOT_STARTED"));

        assertThatThrownBy(() -> orchestrator.runApprovalFlow(
            SESSION_ID, profile(), sessionContext, recommendation, userDecision
        )).isInstanceOf(IllegalStateException.class);

        verify(executionPlanService, never()).submitAndRun(any(), any());
    }

    @Test
    void 필수_인자가_null이면_NPE를_던진다() {
        Recommendation recommendation = recommendation();
        UserDecision userDecision = UserDecision.approve();
        ChickenStoreSessionContext sessionContext = sessionContext();
        CanonicalProfile profile = profile();

        assertThatThrownBy(() -> orchestrator.runApprovalFlow(null, profile, sessionContext, recommendation, userDecision))
            .isInstanceOf(NullPointerException.class);
        assertThatThrownBy(() -> orchestrator.runApprovalFlow(SESSION_ID, null, sessionContext, recommendation, userDecision))
            .isInstanceOf(NullPointerException.class);
        assertThatThrownBy(() -> orchestrator.runApprovalFlow(SESSION_ID, profile, null, recommendation, userDecision))
            .isInstanceOf(NullPointerException.class);
        assertThatThrownBy(() -> orchestrator.runApprovalFlow(SESSION_ID, profile, sessionContext, null, userDecision))
            .isInstanceOf(NullPointerException.class);
        assertThatThrownBy(() -> orchestrator.runApprovalFlow(SESSION_ID, profile, sessionContext, recommendation, null))
            .isInstanceOf(NullPointerException.class);
    }

    private static Recommendation recommendation() {
        return new Recommendation(
            "CHICKEN-001", List.of(), List.of(), Map.of(), List.of("테스트 추천 사유"), List.of(), 0.9, false
        );
    }

    private static CanonicalProfile profile() {
        return new CanonicalProfile(
            "user_test_001",
            "테스트 사용자",
            DataClassification.SYNTHETIC_PROFILE,
            new ProfileSource(CollectionChannel.WEB_FORM, TEAM_ID, Instant.parse("2026-08-01T00:00:00Z")),
            new Accessibility(false, false, false, false, false, false, false),
            new Interaction(PreferredInput.TOUCH, "ko-KR", true),
            new Consent(false, RetentionPolicy.SESSION_ONLY)
        );
    }

    private static ChickenStoreSessionContext sessionContext() {
        return new ChickenStoreSessionContext(
            new SessionIntent(SessionTask.ORDER_FOOD),
            new ChickenStoreFacts(),
            new ChickenStorePreferences(null, null, null, null, null),
            new ChickenStoreHardConstraints(null, null),
            new ChickenStoreCapabilities(),
            Map.of()
        );
    }
}
