package com.kiobridge.kiobridge.orchestrator.controller;

import com.kiobridge.kiobridge.common.web.ApiException;
import com.kiobridge.kiobridge.contracts.Evidence;
import com.kiobridge.kiobridge.contracts.Recommendation;
import com.kiobridge.kiobridge.contracts.UserDecision;
import com.kiobridge.kiobridge.contracts.client.dto.ExecuteResult;
import com.kiobridge.kiobridge.contracts.input.context.ChickenStoreSessionContext;
import com.kiobridge.kiobridge.contracts.input.profile.CanonicalProfile;
import com.kiobridge.kiobridge.modules.pairing.service.PairingRegistry;
import com.kiobridge.kiobridge.modules.stateevidence.service.ApprovalResult;
import com.kiobridge.kiobridge.modules.stateevidence.service.EvidenceParsingService;
import com.kiobridge.kiobridge.modules.stateevidence.service.EvidenceSummary;
import com.kiobridge.kiobridge.modules.stateevidence.service.EvidenceSummaryService;
import com.kiobridge.kiobridge.modules.stateevidence.service.RunSummaryService;
import com.kiobridge.kiobridge.modules.stateevidence.service.ValidationErrorMessageService;
import com.kiobridge.kiobridge.orchestrator.controller.dto.OrchestratorRunRequest;
import com.kiobridge.kiobridge.orchestrator.service.SubmissionOrchestrator;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class OrchestratorControllerPairingTest {

    @Test
    void 승인_응답에서_RC5_세션_식별자를_제거한다() throws Exception {
        SubmissionOrchestrator orchestrator = mock(SubmissionOrchestrator.class);
        EvidenceParsingService evidenceParsingService = mock(EvidenceParsingService.class);
        EvidenceSummaryService evidenceSummaryService = mock(EvidenceSummaryService.class);
        PairingRegistry registry = new PairingRegistry();
        CanonicalProfile profile = mock(CanonicalProfile.class);
        ChickenStoreSessionContext context = mock(ChickenStoreSessionContext.class);
        Recommendation recommendation = mock(Recommendation.class);
        UserDecision decision = mock(UserDecision.class);
        String pairingId = registry.register(
            "SIM-SECRET-001", "chicken-store", "SERVICE_TYPE"
        ).pairingId();
        registry.bindInput(pairingId, profile, context);

        ObjectMapper objectMapper = new ObjectMapper();
        JsonNode evidenceJson = objectMapper.readTree("{}");
        Evidence evidence = mock(Evidence.class);
        when(evidence.runId()).thenReturn("RUN-001");
        when(evidence.result()).thenReturn("PASS");
        when(evidence.stopType()).thenReturn("NORMAL_BOUNDARY_STOP");
        when(evidence.executedActions()).thenReturn(List.of());
        when(evidence.reviewSnapshot()).thenReturn(Map.of(
            "cartItems", List.of(Map.of(
                "name", "매운 순살 닭강정", "price", 6000, "quantity", 2
            )),
            "total", 12000,
            "sessionId", "SIM-SECRET-001",
            "rc5SessionId", "SIM-SECRET-001",
            "unknown", "INTERNAL"
        ));
        when(evidenceParsingService.parse(evidenceJson)).thenReturn(evidence);
        when(evidenceSummaryService.summarize(evidence))
            .thenReturn(new EvidenceSummary("완료", null, null));
        when(orchestrator.runApprovalFlow(
            eq("SIM-SECRET-001"), eq(profile), eq(context), eq(recommendation), eq(decision)
        )).thenReturn(new ExecuteResult(true, null, evidenceJson, null));

        OrchestratorController controller = new OrchestratorController(
            orchestrator,
            evidenceParsingService,
            evidenceSummaryService,
            mock(ValidationErrorMessageService.class),
            mock(RunSummaryService.class),
            registry
        );

        ApprovalResult response = controller.approve(new OrchestratorRunRequest(
            pairingId, profile, context, recommendation, decision
        ));
        String json = objectMapper.writeValueAsString(response);

        assertThat(json).contains("cartItems", "total", "12000");
        assertThat(json).doesNotContain(
            "SIM-SECRET-001", "sessionId", "rc5SessionId", "unknown", "INTERNAL"
        );
    }

    @Test
    void 실행에서_예외가_나도_pairing을_폐기한다() {
        SubmissionOrchestrator orchestrator = mock(SubmissionOrchestrator.class);
        PairingRegistry registry = new PairingRegistry();
        CanonicalProfile profile = mock(CanonicalProfile.class);
        ChickenStoreSessionContext context = mock(ChickenStoreSessionContext.class);
        Recommendation recommendation = mock(Recommendation.class);
        UserDecision decision = mock(UserDecision.class);
        String pairingId = registry.register(
            "SIM-SECRET-001", "chicken-store", "SERVICE_TYPE"
        ).pairingId();
        registry.bindInput(pairingId, profile, context);

        OrchestratorController controller = new OrchestratorController(
            orchestrator,
            mock(EvidenceParsingService.class),
            mock(EvidenceSummaryService.class),
            mock(ValidationErrorMessageService.class),
            mock(RunSummaryService.class),
            registry
        );
        when(orchestrator.runApprovalFlow(
            eq("SIM-SECRET-001"), eq(profile), eq(context), eq(recommendation), eq(decision)
        )).thenThrow(new IllegalStateException("network result unknown"));

        assertThatThrownBy(() -> controller.approve(new OrchestratorRunRequest(
            pairingId, profile, context, recommendation, decision
        ))).isInstanceOf(IllegalStateException.class);

        assertThatThrownBy(() -> registry.bindInput(pairingId, profile, context))
            .isInstanceOfSatisfying(ApiException.class,
                e -> assertThat(e.code()).isEqualTo("PAIRING_NOT_FOUND"));
    }

    @Test
    void 프로필_불일치로_예약에_실패해도_pairing을_폐기한다() {
        PairingRegistry registry = new PairingRegistry();
        CanonicalProfile boundProfile = mock(CanonicalProfile.class);
        CanonicalProfile changedProfile = mock(CanonicalProfile.class);
        ChickenStoreSessionContext context = mock(ChickenStoreSessionContext.class);
        Recommendation recommendation = mock(Recommendation.class);
        UserDecision decision = mock(UserDecision.class);
        String pairingId = registry.register(
            "SIM-SECRET-001", "chicken-store", "SERVICE_TYPE"
        ).pairingId();
        registry.bindInput(pairingId, boundProfile, context);

        OrchestratorController controller = new OrchestratorController(
            mock(SubmissionOrchestrator.class),
            mock(EvidenceParsingService.class),
            mock(EvidenceSummaryService.class),
            mock(ValidationErrorMessageService.class),
            mock(RunSummaryService.class),
            registry
        );

        assertThatThrownBy(() -> controller.approve(new OrchestratorRunRequest(
            pairingId, changedProfile, context, recommendation, decision
        ))).isInstanceOfSatisfying(ApiException.class,
            e -> assertThat(e.code()).isEqualTo("PAIRING_PROFILE_MISMATCH"));

        assertThatThrownBy(() -> registry.bindInput(pairingId, boundProfile, context))
            .isInstanceOfSatisfying(ApiException.class,
                e -> assertThat(e.code()).isEqualTo("PAIRING_NOT_FOUND"));
    }
}
