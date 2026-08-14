package com.kiobridge.kiobridge.orchestrator.controller;

import com.kiobridge.kiobridge.common.web.ApiException;
import com.kiobridge.kiobridge.contracts.Recommendation;
import com.kiobridge.kiobridge.contracts.UserDecision;
import com.kiobridge.kiobridge.contracts.input.context.ChickenStoreSessionContext;
import com.kiobridge.kiobridge.contracts.input.profile.CanonicalProfile;
import com.kiobridge.kiobridge.modules.pairing.service.PairingRegistry;
import com.kiobridge.kiobridge.modules.stateevidence.service.EvidenceParsingService;
import com.kiobridge.kiobridge.modules.stateevidence.service.EvidenceSummaryService;
import com.kiobridge.kiobridge.modules.stateevidence.service.RunSummaryService;
import com.kiobridge.kiobridge.modules.stateevidence.service.ValidationErrorMessageService;
import com.kiobridge.kiobridge.orchestrator.controller.dto.OrchestratorRunRequest;
import com.kiobridge.kiobridge.orchestrator.service.SubmissionOrchestrator;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class OrchestratorControllerPairingTest {

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
}
