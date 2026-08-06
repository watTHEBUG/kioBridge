package com.kiobridge.kiobridge.modules.stateevidence.service;

import com.kiobridge.kiobridge.contracts.Evidence;
import org.springframework.stereotype.Service;

@Service
public class EvidenceSummaryService {

    public EvidenceSummary summarize(Evidence evidence) {
        String status;
        if ("PASS".equals(evidence.result())) {
            status = "정상 완료";
        } else if (evidence.plannedPaymentActionCount() > 0) {
            status = "실패 (결제 관련 동작이 계획에 포함됨)";
        } else if ("SAFETY_STOP".equals(evidence.stopType())) {
            status = "안전하게 중단됨";
        } else {
            status = "실패";
        }

        String reason = !"PASS".equals(evidence.result())
            ? evidence.stopReason()
            : null;

        return new EvidenceSummary(
            status,
            evidence.recommendation(),
            reason
        );
    }
}