package com.kiobridge.kiobridge.common.web;

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
 */
public class ApiException extends RuntimeException {

    private final String code;

    public ApiException(String code, String message) {
        super(message);
        this.code = code;
    }

    public ApiException(String code, String message, Throwable cause) {
        super(message, cause);
        this.code = code;
    }

    public String code() {
        return code;
    }
}
