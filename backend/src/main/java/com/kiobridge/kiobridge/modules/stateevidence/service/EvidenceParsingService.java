package com.kiobridge.kiobridge.modules.stateevidence.service;

import com.kiobridge.kiobridge.common.web.ApiException;
import com.kiobridge.kiobridge.contracts.Evidence;
import com.kiobridge.kiobridge.contracts.RunResult;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * ExecuteResult.evidence()/run()로 오는 JsonNode를 각각 Evidence/RunResult 타입으로 변환한다.
 * Simulation API 응답이 evidence.schema.json 기준을 따른다는 전제 하에 동작하며,
 * 필수 필드가 없거나 형식이 다르면 예외를 던진다.
 *
 * 이 클래스가 다루는 evidenceJson/runJson은 전부 Kit(Simulation API)이 우리에게 돌려준 응답이지,
 * 우리 HTTP 호출자가 보낸 요청이 아니다 — 그래서 여기서 던지는 모든 ApiException은 502다
 * (CodeRabbit 지적 사항: 업스트림 데이터 문제를 400으로 돌려주면 호출자가 재시도해도 소용없는데
 * 마치 자기 요청을 고치면 될 것처럼 보인다).
 */
@Service
public class EvidenceParsingService {

    private static final String[] REQUIRED_FIELDS = {
        "evidenceVersion", "runId", "sessionId", "environmentId", "fixtureVersion",
        "submissionHash", "createdAt", "validationMode", "executionEnvironment",
        "result", "stopType", "resultScope"
    };

    private final ObjectMapper objectMapper;

    public EvidenceParsingService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public Evidence parse(JsonNode evidenceJson) {
        if (evidenceJson == null || evidenceJson.isNull()) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "EVIDENCE_EMPTY", "evidence가 비어 있습니다.");
        }
        validateRequiredFields(evidenceJson);
        try {
            return objectMapper.treeToValue(evidenceJson, Evidence.class);
        } catch (Exception e) {
            throw new ApiException(
                HttpStatus.BAD_GATEWAY,
                "EVIDENCE_PARSE_FAILED",
                "evidence JSON을 Evidence 타입으로 변환하지 못했습니다: " + e.getMessage(), e
            );
        }
    }

    /** ExecuteResult.run()으로 오는 JsonNode를 RunResult로 변환한다. run이 없으면 null을 반환한다. */
    public RunResult parseRun(JsonNode runJson) {
        if (runJson == null || runJson.isNull()) {
            return null;
        }
        try {
            return objectMapper.treeToValue(runJson, RunResult.class);
        } catch (Exception e) {
            throw new ApiException(
                HttpStatus.BAD_GATEWAY,
                "RUN_RESULT_PARSE_FAILED",
                "run JSON을 RunResult 타입으로 변환하지 못했습니다: " + e.getMessage(), e
            );
        }
    }

    private void validateRequiredFields(JsonNode evidenceJson) {
        for (String field : REQUIRED_FIELDS) {
            if (!evidenceJson.has(field) || evidenceJson.get(field).isNull()) {
                // Kit이 evidence.schema.json을 어기고 필수 필드를 빠뜨린 경우 — 우리 자신의
                // REQUIRED_FIELD_MISSING(우리 요청이 불완전할 때)과 구분하기 위해 별도 코드를 쓴다.
                throw new ApiException(
                    HttpStatus.BAD_GATEWAY,
                    "EVIDENCE_REQUIRED_FIELD_MISSING",
                    "evidence JSON에 필수 필드가 없습니다: " + field
                );
            }
        }
    }
}