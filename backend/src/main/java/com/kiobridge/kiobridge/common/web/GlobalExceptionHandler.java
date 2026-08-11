package com.kiobridge.kiobridge.common.web;

import com.kiobridge.kiobridge.modules.member.exception.DuplicateLoginIdException;
import com.kiobridge.kiobridge.modules.member.exception.InvalidCredentialsException;
import com.kiobridge.kiobridge.modules.member.exception.UserNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientException;

/**
 * 도메인 예외를 구분되는 HTTP 상태 코드로 변환한다 (CodeRabbit 지적 사항).
 *
 * 지금까지 어떤 컨트롤러도 예외 처리를 하지 않아서, IllegalStateException/IllegalArgumentException
 * 같은 요청 검증 실패나 Simulation API 통신 실패가 전부 구분 안 되는 500으로 나가고 있었다.
 * @RestControllerAdvice는 애플리케이션 전역에 적용되므로 이 프로젝트의 모든 컨트롤러(다른 STEP
 * 컨트롤러 포함)에 동일하게 적용된다 — 의도한 범위 확장이니 참고.
 *
 * ApiException은 STEP1~9 파이프라인에서 "어떤 상황인지" 구분되는 code를 직접 실어 던지는 예외다
 * (예: CANDIDATE_NOT_FOUND, EXECUTION_OPTION_GROUP_UNKNOWN). 이 handler는 그 code와, 예외
 * 자신이 판단한 status(기본 400, 일부는 5xx — ApiException 클래스 Javadoc 참고)를 그대로
 * 반영한다.
 *
 * IllegalArgumentException/IllegalStateException은 ApiException으로 아직 옮기지 않은 나머지
 * 예외들을 위한 fallback이라 code는 "INVALID_REQUEST"로 뭉뚱그려진다.
 *
 * NullPointerException(CodeRabbit 지적 사항)은 REQUIRED_FIELD_MISSING으로 다루지 않는다.
 * Objects.requireNonNull은 "요청 필드가 비어있다"는 의미로도 쓰이지만, 일반적인 null 역참조
 * 버그와 타입상 구분이 안 된다 — 전자와 후자를 같은 code/상태로 묶으면 우리 쪽 프로그램 결함이
 * 클라이언트 요청 문제(400)로 둔갑한다. 그래서 여기서는 500(무슨 상황인지 특정할 수 없는 서버
 * 결함)으로만 응답하고, 정말 "필수 필드가 없다"는 뜻으로 던지고 싶은 곳은 발생 지점에서 직접
 * ApiException("REQUIRED_FIELD_MISSING", ...)을 던지도록 개별 전환해야 한다(전체 전환은 아직
 * 하지 않음 — 68곳 넘는 Objects.requireNonNull 호출부 전수 조사가 필요한 별도 작업).
 * 메시지는 우리가 직접 호출자에게 보여주려고 작성한 문장들이라(예: "추천된 candidateId(...)가
 * fixture 후보 목록에 없습니다") 그대로 노출한다.
 * Simulation API 쪽 예외(RestClientException 계열)는 원본 응답 본문을 그대로 흘려보내지 않고
 * 일반화된 메시지로 감싼다 — 내부 통신 세부사항을 호출자에게 노출하지 않기 위함이다.
 *
 * NullPointerException의 e.getMessage()는 응답에 그대로 노출하지 않는다(CodeRabbit 지적 사항).
 * 위 ApiException/IllegalArgumentException/IllegalStateException은 전부 우리가 직접 호출자에게
 * 보여주려고 작성한 문장이라 노출해도 안전하지만, 처리되지 않은 NPE는 예상 못 한 위치에서
 * 터진 것이라 메시지에 어떤 내부 상태(필드값, 클래스 구조 등)가 실려 있을지 보장할 수 없다.
 * 그래서 원본은 서버 로그에만 남기고, 응답에는 고정된 일반 메시지만 돌려준다.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ApiErrorResponse> handleApiException(ApiException e) {
        return ResponseEntity.status(e.status()).body(new ApiErrorResponse(e.code(), e.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiErrorResponse> handleMethodArgumentNotValid(
            MethodArgumentNotValidException e
    ) {
        String message = e.getBindingResult()
                .getFieldErrors()
                .stream()
                .findFirst()
                .map(error -> {
                    String reason = error.getDefaultMessage() == null
                            ? "값이 올바르지 않습니다."
                            : error.getDefaultMessage();

                    return error.getField() + ": " + reason;
                })
                .orElse("요청 값이 올바르지 않습니다.");

        return ResponseEntity
                .badRequest()
                .body(
                        new ApiErrorResponse(
                                "INVALID_REQUEST",
                                message
                        )
                );
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiErrorResponse> handleIllegalArgument(IllegalArgumentException e) {
        return badRequest(e.getMessage());
    }

    /**
     * 임의의 null 역참조 버그와 "필수 요청 필드 없음"을 구분할 수 없으므로(CodeRabbit 지적 사항),
     * 500 + 상황을 특정하지 않는 code로만 응답한다. ApiException 쪽 Javadoc 참고.
     * 원본 메시지는 로그에만 남기고 응답에는 고정 문구만 실어 보낸다(CodeRabbit 지적 사항 —
     * 예상 못 한 NPE 메시지가 내부 상태를 노출할 수 있음).
     */
    @ExceptionHandler(NullPointerException.class)
    public ResponseEntity<ApiErrorResponse> handleNullPointer(NullPointerException e) {
        log.error("처리되지 않은 NullPointerException", e);
        return ResponseEntity.internalServerError()
            .body(new ApiErrorResponse("INTERNAL_SERVER_ERROR", "서버 내부 오류가 발생했습니다."));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ApiErrorResponse> handleIllegalState(IllegalStateException e) {
        return badRequest(e.getMessage());
    }

    /** 연결/응답 타임아웃 등 Simulation API에 아예 닿지 못한 경우. */
    @ExceptionHandler(ResourceAccessException.class)
    public ResponseEntity<ApiErrorResponse> handleResourceAccess(ResourceAccessException e) {
        return ResponseEntity.status(HttpStatus.GATEWAY_TIMEOUT).body(
            new ApiErrorResponse(
                "SIMULATION_API_TIMEOUT",
                "Simulation API 응답이 너무 늦어요. 잠시 후 다시 시도해 주세요."
            )
        );
    }

    /** Simulation API가 오류 상태로 응답한 경우 등 그 외 통신 실패 전반. */
    @ExceptionHandler(RestClientException.class)
    public ResponseEntity<ApiErrorResponse> handleRestClient(RestClientException e) {
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(
            new ApiErrorResponse(
                "SIMULATION_API_ERROR",
                "Simulation API와 통신하는 데 실패했어요."
            )
        );
    }

    private ResponseEntity<ApiErrorResponse> badRequest(String message) {
        return ResponseEntity.badRequest().body(new ApiErrorResponse("INVALID_REQUEST", message));
    }

    @ExceptionHandler(DuplicateLoginIdException.class)
    public ResponseEntity<ApiErrorResponse> handleDuplicateLoginId(
            DuplicateLoginIdException e
    ) {
        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(
                        new ApiErrorResponse(
                                "LOGIN_ID_DUPLICATED",
                                e.getMessage()
                        )
                );
    }

    @ExceptionHandler(InvalidCredentialsException.class)
    public ResponseEntity<ApiErrorResponse> handleInvalidCredentials(
            InvalidCredentialsException e
    ) {
        return ResponseEntity
                .status(HttpStatus.UNAUTHORIZED)
                .body(
                        new ApiErrorResponse(
                                "INVALID_CREDENTIALS",
                                e.getMessage()
                        )
                );
    }
    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<ApiErrorResponse> handleUserNotFound(
            UserNotFoundException e
    ) {
        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(
                        new ApiErrorResponse(
                                "USER_NOT_FOUND",
                                e.getMessage()
                        )
                );
    }
}
