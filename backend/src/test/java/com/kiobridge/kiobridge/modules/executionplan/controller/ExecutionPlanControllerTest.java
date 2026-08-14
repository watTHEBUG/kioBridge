package com.kiobridge.kiobridge.modules.executionplan.controller;

import com.kiobridge.kiobridge.contracts.client.dto.SessionCreateResponse;
import com.kiobridge.kiobridge.modules.executionplan.controller.dto.CreateSessionRequest;
import com.kiobridge.kiobridge.modules.executionplan.service.ExecutionPlanService;
import com.kiobridge.kiobridge.modules.pairing.service.PairingRegistry;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ExecutionPlanControllerTest {

    @Test
    void 세션_생성_응답에는_rc5세션이_아닌_pairingId만_포함한다() {
        ExecutionPlanService executionPlanService = mock(ExecutionPlanService.class);
        PairingRegistry registry = new PairingRegistry();
        ExecutionPlanController controller = new ExecutionPlanController(executionPlanService, registry);
        when(executionPlanService.createSession("chicken-store")).thenReturn(new SessionCreateResponse(
            "SIM-SECRET-001",
            "chicken-store",
            "fixture-v1",
            "SERVICE_TYPE",
            "CREATED",
            "STRICT",
            "SIMULATION_ONLY",
            "simulation-driver",
            "/api/v1/sessions/SIM-SECRET-001/submission"
        ));

        var response = controller.createSession(new CreateSessionRequest("chicken-store", "kb_demo"));

        assertThat(response.pairingId()).doesNotContain("SIM-SECRET-001");
        assertThat(response.environmentId()).isEqualTo("chicken-store");
        assertThat(response.initialState()).isEqualTo("SERVICE_TYPE");
        assertThat(response.expiresAt()).isPositive();
    }
}
