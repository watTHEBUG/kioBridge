package com.kiobridge.kiobridge.orchestrator.controller;

import com.kiobridge.kiobridge.contracts.Evidence;
import com.kiobridge.kiobridge.contracts.RunResult;
import com.kiobridge.kiobridge.contracts.client.dto.ExecuteResult;
import com.kiobridge.kiobridge.modules.stateevidence.service.ApprovalResult;
import com.kiobridge.kiobridge.modules.stateevidence.service.ClientExecutionResult;
import com.kiobridge.kiobridge.modules.stateevidence.service.ClientReviewSnapshot;
import com.kiobridge.kiobridge.modules.stateevidence.service.EvidenceParsingService;
import com.kiobridge.kiobridge.modules.stateevidence.service.EvidenceSummary;
import com.kiobridge.kiobridge.modules.stateevidence.service.EvidenceSummaryService;
import com.kiobridge.kiobridge.modules.stateevidence.service.RunStep;
import com.kiobridge.kiobridge.modules.stateevidence.service.RunSummaryService;
import com.kiobridge.kiobridge.modules.stateevidence.service.ValidationErrorMessageService;
import com.kiobridge.kiobridge.orchestrator.controller.dto.OrchestratorRunRequest;
import com.kiobridge.kiobridge.orchestrator.service.SubmissionOrchestrator;
import com.kiobridge.kiobridge.modules.pairing.service.PairingRegistry;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * STEP9(buildExecutionPlan) -> ParticipantSubmission 조립 -> 제출/검증/실행을 한 번에 처리하는
 * 진입점. 프론트가 recommendation/executionPlan을 직접 조립할 수단이 없었기 때문에(STEP4/5
 * 결과와 STEP9 결과를 프론트가 들고 있지 않음), 그 조립을 여기서 대신한다.
 *
 * 브라우저가 pairing 검증을 우회하지 못하도록 저수준 plan/build 및 submit-and-run HTTP 진입점은
 * 노출하지 않고, 승인 요청은 이 컨트롤러의 pairing 검증 경로만 사용한다.
 */
@RestController
@RequestMapping("/internal/orchestrator")
public class OrchestratorController {

    private final SubmissionOrchestrator submissionOrchestrator;             // 제출물 조립부터 RC5 실행까지 담당
    private final EvidenceParsingService evidenceParsingService;             // RC5 JSON 결과를 내부 타입으로 변환
    private final EvidenceSummaryService evidenceSummaryService;             // 실행 증거를 사용자용 요약으로 변환
    private final ValidationErrorMessageService validationErrorMessageService; // 검증 오류 코드를 사용자 문구로 변환
    private final RunSummaryService runSummaryService;                       // RC5 실행 과정을 화면 재생 단계로 변환
    private final PairingRegistry pairingRegistry;                           // pairing 검증·예약·폐기를 담당

    public OrchestratorController(
        SubmissionOrchestrator submissionOrchestrator,
        EvidenceParsingService evidenceParsingService,
        EvidenceSummaryService evidenceSummaryService,
        ValidationErrorMessageService validationErrorMessageService,
        RunSummaryService runSummaryService,
        PairingRegistry pairingRegistry
    ) {
        this.submissionOrchestrator = submissionOrchestrator;
        this.evidenceParsingService = evidenceParsingService;
        this.evidenceSummaryService = evidenceSummaryService;
        this.validationErrorMessageService = validationErrorMessageService;
        this.runSummaryService = runSummaryService;
        this.pairingRegistry = pairingRegistry;
    }

    /** POST /internal/orchestrator/approve — STEP9 조립부터 실행까지 전체 승인 플로우. */
    @PostMapping("/approve")
    public ApprovalResult approve(@RequestBody OrchestratorRunRequest request) {
        try {
            PairingRegistry.Reservation reservation = pairingRegistry.reserveForExecution( // 검증을 마친 실제 RC5 실행 권한
                    request.pairingId(), request.profile(), request.sessionContext()
            );

            ExecuteResult result = submissionOrchestrator.runApprovalFlow( // RC5 제출·검증·실행 원본 결과
                    reservation.rc5SessionId(),
                    request.profile(),
                    request.sessionContext(),
                    request.recommendation(),
                    request.userDecision()
            );

            EvidenceSummary summary = null;                  // 성공 결과를 설명하는 사용자용 요약
            ClientExecutionResult execution = null;          // 내부 식별자를 제거한 브라우저용 실행 결과
            List<String> validationMessages = List.of();     // 검증 실패 시 보여줄 사용자 메시지
            List<RunStep> runSteps = List.of();               // 키오스크 실행 과정을 보여줄 단계 목록

            if (result.valid() && result.evidence() != null && !result.evidence().isNull()) {
                try {
                    Evidence evidence = evidenceParsingService.parse(result.evidence()); // 파싱된 RC5 실행 증거
                    summary = evidenceSummaryService.summarize(evidence);
                    execution = new ClientExecutionResult(
                        evidence.runId(),
                        evidence.result(),
                        evidence.stopType(),
                        evidence.stopReason(),
                        evidence.executedActions() == null ? 0 : evidence.executedActions().size(),
                        ClientReviewSnapshot.from(evidence.reviewSnapshot())
                    );
                } catch (Exception e) {
                    summary = new EvidenceSummary("결과를 처리하는 중 문제가 발생했습니다.", null, null);
                }

                if (result.run() != null && !result.run().isNull()) {
                    try {
                        RunResult run = evidenceParsingService.parseRun(result.run()); // 파싱된 RC5 단계별 실행 결과
                        runSteps = runSummaryService.summarize(run);
                    } catch (Exception e) {
                        runSteps = List.of();
                    }
                }
            } else if (!result.valid() && result.validation() != null) {
                validationMessages = result.validation().errors().stream()
                    .map(err -> validationErrorMessageService.toFriendlyMessage(err.code()))
                    .distinct()
                    .toList();
            }

            return new ApprovalResult(result.valid(), summary, validationMessages, runSteps, execution);
        } finally {
            // 실행 결과가 불명확한 네트워크 예외도 재사용하지 않는다. 새 QR 연결이 필요하다.
            pairingRegistry.close(request.pairingId());
        }
    }
}
