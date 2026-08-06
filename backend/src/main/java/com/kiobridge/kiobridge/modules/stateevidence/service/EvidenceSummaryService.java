package com.kiobridge.kiobridge.modules.stateevidence.service;

import com.kiobridge.kiobridge.contracts.Evidence;
import org.springframework.stereotype.Service;

@Service
public class EvidenceSummaryService {

    public EvidenceSummary summarize(Evidence evidence) {
        String status = evidence.result().equals("PASS")
            ? "정상 완료" : "안전하게 중단됨";

        String reason = "SAFETY_STOP".equals(evidence.stopType())
            ? evidence.stopReason()
            : null;

        return new EvidenceSummary(
            status,
            evidence.recommendation(),
            reason
        );
    }
}