package com.kiobridge.kiobridge.modules.executionplan.service;

import com.kiobridge.kiobridge.contracts.ParticipantSubmission;
import com.kiobridge.kiobridge.contracts.client.SimulationApiClient;
import com.kiobridge.kiobridge.contracts.client.dto.ExecuteResult;
import com.kiobridge.kiobridge.contracts.client.dto.SessionCreateResponse;
import com.kiobridge.kiobridge.contracts.client.dto.ValidationResult;
import com.kiobridge.kiobridge.contracts.ExecutionPlan;
import com.kiobridge.kiobridge.contracts.UserDecision;
import org.springframework.stereotype.Service;

/**
 * STEP 8~9 + Simulation API 제출 파이프라인을 오케스트레이션한다.
 * 담당2 의 recommendation, 프론트에서 받은 사용자 승인 결과를 받아
 * 실행계획을 만들고 KioBridge 서버에 제출 -> 검증 -> 실행까지 처리한다.
 */
@Service
public class ExecutionPlanService {

    private final SimulationApiClient simulationApiClient;

    public ExecutionPlanService(SimulationApiClient simulationApiClient) {
        this.simulationApiClient = simulationApiClient;
    }

    /**
     * userDecision.approved()==false 이면 반드시 빈 ExecutionPlan을 반환한다 (Kit 검증 규칙,
     * 어기면 validate 단계에서 USER_NOT_APPROVED 류 오류로 거부된다).
     *
     * TODO: 담당2의 Recommendation 타입이 확정되면 Object 대신 실제 타입으로 교체하고,
     *       추천된 candidateId·선택된 옵션들을 바탕으로 Action 리스트를 조립한다.
     */
    public ExecutionPlan buildExecutionPlan(UserDecision userDecision, Object recommendation) {
        if (!userDecision.approved()) {
            return ExecutionPlan.empty();
        }
        // TODO: recommendation 기반 Action 조립 (select_service -> select_menu -> select_option* -> confirm_option -> open_cart_review -> verify_cart)
        return ExecutionPlan.empty();
    }

    /**
     * 세션 생성 -> 제출 -> 검증 -> (통과 시) 실행까지 한 번에 처리한다.
     * 검증에 실패하면 execute를 호출하지 않고 그 자리에서 실패 결과를 반환한다.
     */
    public ExecuteResult submitAndRun(String environmentId, ParticipantSubmission submission) {
        assertApprovalInvariant(submission);

        SessionCreateResponse session = simulationApiClient.createSession(environmentId);

        simulationApiClient.submit(session.sessionId(), submission);

        ValidationResult validation = simulationApiClient.validate(session.sessionId());
        if (!validation.valid()) {
            return new ExecuteResult(false, null, null, validation);
        }

        return simulationApiClient.execute(session.sessionId());
    }

    /**
     * userDecision.approved()==false 인데 executionPlan.actions가 비어있지 않은 제출은
     * 여기서 즉시 거부한다. 원격 validate가 결국 걸러내긴 하지만, 이건 Kit이 정의한
     * 안전-critical 불변식이라 submitAndRun 호출자가 buildExecutionPlan()을 거치지 않고
     * ParticipantSubmission을 직접 조립했을 가능성까지 막기 위해 제출 경계에서도 로컬로 검증한다.
     */
    private void assertApprovalInvariant(ParticipantSubmission submission) {
        UserDecision userDecision = submission.userDecision();
        ExecutionPlan executionPlan = submission.executionPlan();
        if (!userDecision.approved() && !executionPlan.actions().isEmpty()) {
            throw new IllegalArgumentException(
                "userDecision.approved=false 인데 executionPlan.actions가 비어있지 않습니다. "
                    + "buildExecutionPlan()을 거치지 않고 조립된 제출로 보입니다."
            );
        }
    }
}
