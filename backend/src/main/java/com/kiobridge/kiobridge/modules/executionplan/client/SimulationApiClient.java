package com.kiobridge.kiobridge.modules.executionplan.client;

import com.kiobridge.kiobridge.contracts.ParticipantSubmission;
import com.kiobridge.kiobridge.modules.executionplan.client.dto.ExecuteResult;
import com.kiobridge.kiobridge.modules.executionplan.client.dto.SessionCreateResponse;
import com.kiobridge.kiobridge.modules.executionplan.client.dto.ValidationResult;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Map;

/**
 * KioBridge Simulation API(:4000) 전용 클라이언트.
 * 세션 생성 -> 제출 -> 검증 -> 실행 순서를 그대로 호출한다.
 * 기존에 계획했던 "기존 Agent adapter"는 개발하지 않으며, 이 클래스가 그 역할을 대체한다.
 *
 * base-url 은 application.yaml 의 kiobridge.simulation-api.base-url 로 주입한다.
 */
@Component
public class SimulationApiClient {

    private final RestClient restClient;

    public SimulationApiClient(@Value("${kiobridge.simulation-api.base-url}") String baseUrl) {
        this.restClient = RestClient.builder()
            .baseUrl(baseUrl)
            .build();
    }

    /** POST /api/v1/sessions */
    public SessionCreateResponse createSession(String environmentId) {
        return restClient.post()
            .uri("/api/v1/sessions")
            .contentType(MediaType.APPLICATION_JSON)
            .body(Map.of("environmentId", environmentId))
            .retrieve()
            .body(SessionCreateResponse.class);
    }

    /** POST /api/v1/sessions/:sessionId/submission — 저장만 하고 상태를 SUBMITTED로 바꾼다. */
    public void submit(String sessionId, ParticipantSubmission submission) {
        restClient.post()
            .uri("/api/v1/sessions/{sessionId}/submission", sessionId)
            .contentType(MediaType.APPLICATION_JSON)
            .body(submission)
            .retrieve()
            .toBodilessEntity();
    }

    /** POST /api/v1/sessions/:sessionId/validate — 스키마+시맨틱+상태머신 dry-run. */
    public ValidationResult validate(String sessionId) {
        return restClient.post()
            .uri("/api/v1/sessions/{sessionId}/validate", sessionId)
            .retrieve()
            .body(ValidationResult.class);
    }

    /** POST /api/v1/sessions/:sessionId/execute — 검증 통과분만 Simulation Driver로 재생. */
    public ExecuteResult execute(String sessionId) {
        return restClient.post()
            .uri("/api/v1/sessions/{sessionId}/execute", sessionId)
            .contentType(MediaType.APPLICATION_JSON)
            .body(Map.of())
            .retrieve()
            .body(ExecuteResult.class);
    }

    /** GET /api/v1/sessions/:sessionId/evidence — 서버가 한 번만 생성한 최종 Evidence. */
    public com.fasterxml.jackson.databind.JsonNode getEvidence(String sessionId) {
        return restClient.get()
            .uri("/api/v1/sessions/{sessionId}/evidence", sessionId)
            .retrieve()
            .body(com.fasterxml.jackson.databind.JsonNode.class);
    }
}
