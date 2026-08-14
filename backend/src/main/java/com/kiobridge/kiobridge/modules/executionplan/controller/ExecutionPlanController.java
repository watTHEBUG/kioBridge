package com.kiobridge.kiobridge.modules.executionplan.controller;

import com.kiobridge.kiobridge.contracts.client.dto.SessionCreateResponse;
import com.kiobridge.kiobridge.modules.executionplan.controller.dto.BindPairingRequest;
import com.kiobridge.kiobridge.modules.executionplan.controller.dto.BindPairingResponse;
import com.kiobridge.kiobridge.modules.executionplan.controller.dto.CreateSessionRequest;
import com.kiobridge.kiobridge.modules.executionplan.controller.dto.CreateSessionResponse;
import com.kiobridge.kiobridge.modules.executionplan.service.ExecutionPlanService;
import com.kiobridge.kiobridge.modules.pairing.service.PairingRegistry;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 프론트/오케스트레이터가 호출하는 담당3 내부 API.
 * 외부 Simulation API(:4000) 호출은 전부 ExecutionPlanService -> SimulationApiClient로 위임하고,
 * 이 컨트롤러는 요청/응답을 내부 API 스펙(docs/담당3_API_명세서.md 2장)에 맞게 변환하는 역할만 한다.
 */
@RestController
@RequestMapping("/internal")
public class ExecutionPlanController {

    private final ExecutionPlanService executionPlanService; // RC5 세션 생성과 실행계획 처리를 담당하는 서비스
    private final PairingRegistry pairingRegistry;           // pairingId와 실제 RC5 세션의 연결 상태 저장소

    public ExecutionPlanController(
        ExecutionPlanService executionPlanService,
        PairingRegistry pairingRegistry
    ) {
        this.executionPlanService = executionPlanService;
        this.pairingRegistry = pairingRegistry;
    }

    /** POST /internal/simulation/session — Simulation API 세션 생성. */
    @PostMapping("/simulation/session")
    public CreateSessionResponse createSession(@RequestBody CreateSessionRequest request) {
        SessionCreateResponse session = executionPlanService.createSession(request.environmentId()); // RC5 원본 세션
        PairingRegistry.CreatedPairing pairing = pairingRegistry.register( // 브라우저에 반환할 비공개화된 연결
            session.sessionId(), session.environmentId(), session.initialState()
        );
        return new CreateSessionResponse(
            pairing.pairingId(), pairing.environmentId(), pairing.initialState(), pairing.expiresAt()
        );
    }

    /** POST /internal/simulation/pairing/bind — 최초 정규화 입력을 이 연결에 고정. */
    @PostMapping("/simulation/pairing/bind")
    public BindPairingResponse bindPairing(@RequestBody BindPairingRequest request) {
        pairingRegistry.bindInput(request.pairingId(), request.profile(), request.sessionContext());
        return new BindPairingResponse(true);
    }

}
