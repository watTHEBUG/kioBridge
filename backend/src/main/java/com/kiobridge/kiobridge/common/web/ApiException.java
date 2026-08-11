package com.kiobridge.kiobridge.common.web;

import org.springframework.http.HttpStatus;

/**
 * "어떤 에러 상황인지" 구분되는 코드를 실어 던지는 unchecked 예외.
 *
 * 배경: 지금까지 STEP1~9 파이프라인 코드는 검증 실패를 전부 IllegalArgumentException/
 * IllegalStateException(메시지만 있고 code 없음)으로 던졌고, GlobalExceptionHandler는 그
 * 예외 "종류"만 보고 code를 "INVALID_REQUEST" 하나로 뭉뚱그려 반환했다. 그 결과 "후보를 못 찾음"과
 * "environmentId가 없음"과 "옵션 그룹이 없음"이 프론트 입장에서 전부 같은 code로 보였다.
 *
 * ApiException은 code를 예외 자체에 실어서, GlobalExceptionHandler가 그 code를 그대로
 * ApiErrorResponse.code()에 반영할 수 있게 한다. 가능하면 Kit의 docs/ERROR_CATALOG.md에 있는
 * 코드 이름을 그대로 재사용한다(개념이 정확히 일치하는 경우) — Kit이 이미 만든 어휘를 따르는 게
 * 팀 전체와 문서 간 일관성에 유리하다. Kit 카탈로그에 대응하는 개념이 없는(우리 파이프라인 내부에서만
 * 발생하는) 상황은 같은 명명 규칙으로 새 코드를 만든다.
 *
 * status (CodeRabbit 지적 사항): 처음엔 모든 ApiException을 400으로 뭉뚱그렸는데, 그중 일부
 * (EXECUTION_OPTION_GROUP_UNKNOWN/OPTION_GROUP_EMPTY — Kit fixture 데이터 자체의 무결성 문제,
 * SESSION_ENVIRONMENT_UNRESOLVED — Kit이 200으로 응답했지만 그 안에 environmentId가 없는 경우,
 * EVIDENCE_* 계열 — Kit이 돌려준 evidence/run JSON 자체가 깨진 경우)는 호출자가 요청을 고쳐도
 * 재현되는 우리/Kit 쪽 문제라 400(재시도해도 소용없다는 뜻의 클라이언트 오류)이 아니라
 * 5xx가 맞다. 기본값은 BAD_REQUEST로 유지한다 — REQUIRED_FIELD_MISSING/ENUM_VALUE_INVALID처럼
 * 절대다수의 코드는 실제로 호출자가 보낸 값이 계약을 어겼을 때만 던져지기 때문이다. 5xx로
 * 분류해야 하는 소수의 코드만 status를 명시하는 생성자를 쓴다.
 */
public class ApiException extends RuntimeException {

    private final String code;
    private final HttpStatus status;

    public ApiException(String code, String message) {
        this(HttpStatus.BAD_REQUEST, code, message);
    }

    public ApiException(String code, String message, Throwable cause) {
        this(HttpStatus.BAD_REQUEST, code, message, cause);
    }

    public ApiException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    public ApiException(HttpStatus status, String code, String message, Throwable cause) {
        super(message, cause);
        this.status = status;
        this.code = code;
    }

    public String code() {
        return code;
    }

    public HttpStatus status() {
        return status;
    }
}
