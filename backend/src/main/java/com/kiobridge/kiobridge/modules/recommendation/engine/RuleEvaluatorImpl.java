package com.kiobridge.kiobridge.modules.recommendation.engine;

import com.kiobridge.kiobridge.contracts.Candidate;
import com.kiobridge.kiobridge.contracts.CompatibilityRule;
import com.kiobridge.kiobridge.contracts.input.context.SessionContextBase;
import org.springframework.stereotype.Component;

/**
 * RuleEvaluator 실제 구현체.
 * operator(DISJOINT/MAX/IN/EQUALS/CONTAINS/CONTAINS_SELECTED/EQUALS_SELECTED)별 판정 로직과
 * unknownPolicy(RECONFIRM/IGNORE/ALLOW/BLOCK) 처리는 담당2(recommendation)가 STEP4/STEP5
 * 로직과 함께 채운다. 시그니처만 먼저 확정해 병렬 개발을 시작한다.
 */
@Component
public class RuleEvaluatorImpl implements RuleEvaluator {

    @Override
    public RuleEvaluationResult evaluate(CompatibilityRule rule, Candidate candidate,
                                          SessionContextBase<?, ?, ?, ?> sessionContext) {
        throw new UnsupportedOperationException(
            "RuleEvaluatorImpl.evaluate: operator/unknownPolicy 별 판정 로직이 아직 구현되지 않았습니다."
        );
    }
}
