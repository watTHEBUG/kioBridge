package com.kiobridge.kiobridge.modules.stateevidence.service;

import com.kiobridge.kiobridge.contracts.Evidence;
import org.springframework.stereotype.Service;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * ExecuteResult.evidence()로 오는 JsonNode를 Evidence 타입으로 변환한다.
 * Simulation API 응답이 evidence.schema.json 기준을 따른다는 전제 하에 동작하며,
 * 필수 필드가 없거나 형식이 다르면 예외를 던진다.
 */
@Service
public class EvidenceParsingService {

    private final ObjectMapper objectMapper;

    public EvidenceParsingService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public Evidence parse(JsonNode evidenceJson) {
        if (evidenceJson == null || evidenceJson.isNull()) {
            throw new IllegalArgumentException("evidence가 비어 있습니다.");
        }
        try {
            return objectMapper.treeToValue(evidenceJson, Evidence.class);
        } catch (Exception e) {
            throw new IllegalStateException(
                "evidence JSON을 Evidence 타입으로 변환하지 못했습니다: " + e.getMessage(), e
            );
        }
    }
}