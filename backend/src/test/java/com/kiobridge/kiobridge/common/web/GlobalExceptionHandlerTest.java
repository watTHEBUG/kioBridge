package com.kiobridge.kiobridge.common.web;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientException;

import static org.assertj.core.api.Assertions.assertThat;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void ApiException은_400과_담아온_code_message를_그대로_돌려준다() {
        ResponseEntity<ApiErrorResponse> response = handler.handleApiException(
            new ApiException("CANDIDATE_NOT_FOUND", "추천된 candidateId(CHICKEN-999)가 fixture 후보 목록에 없습니다.")
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().code()).isEqualTo("CANDIDATE_NOT_FOUND");
        assertThat(response.getBody().message()).contains("CHICKEN-999");
    }

    @Test
    void status를_명시한_ApiException은_그_status를_그대로_돌려준다() {
        // EXECUTION_OPTION_GROUP_UNKNOWN/SESSION_ENVIRONMENT_UNRESOLVED 등 우리·Kit 쪽 데이터
        // 문제로 던지는 코드는 400이 아니라 명시적으로 5xx를 실어 보낸다(CodeRabbit 지적 사항).
        ResponseEntity<ApiErrorResponse> response = handler.handleApiException(
            new ApiException(HttpStatus.BAD_GATEWAY, "SESSION_ENVIRONMENT_UNRESOLVED", "environmentId가 없습니다.")
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_GATEWAY);
        assertThat(response.getBody().code()).isEqualTo("SESSION_ENVIRONMENT_UNRESOLVED");
    }

    @Test
    void IllegalArgumentException은_400과_원본_메시지를_그대로_돌려준다() {
        ResponseEntity<ApiErrorResponse> response =
            handler.handleIllegalArgument(new IllegalArgumentException("environmentId는 비어있을 수 없습니다."));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().code()).isEqualTo("INVALID_REQUEST");
        assertThat(response.getBody().message()).isEqualTo("environmentId는 비어있을 수 없습니다.");
    }

    @Test
    void NullPointerException은_500과_상황을_특정하지_않는_code를_돌려준다() {
        // CodeRabbit 지적 사항: Objects.requireNonNull이 던지는 NPE("필수 요청 필드 없음")와
        // 프로그램 결함으로 인한 임의의 null 역참조는 타입상 구분이 안 된다. 이걸 전부
        // REQUIRED_FIELD_MISSING(400)으로 묶으면 우리 쪽 버그가 클라이언트 요청 문제로 둔갑한다.
        // 그래서 500 + 상황을 특정하지 않는 code로만 응답한다.
        ResponseEntity<ApiErrorResponse> response =
            handler.handleNullPointer(new NullPointerException("sessionId는 null일 수 없습니다."));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(response.getBody().code()).isEqualTo("INTERNAL_SERVER_ERROR");
        assertThat(response.getBody().message()).isEqualTo("서버 내부 오류가 발생했습니다.");
    }

    @Test
    void NullPointerException_원본_메시지는_응답에_노출되지_않는다() {
        // CodeRabbit 지적 사항: 예상 못 한 NPE 메시지에 어떤 내부 상태가 실려 있을지 보장할 수
        // 없으므로, 원본 메시지 문자열이 응답 본문에 그대로 나가면 안 된다.
        ResponseEntity<ApiErrorResponse> response = handler.handleNullPointer(
            new NullPointerException("내부 필드 secretToken이 null입니다")
        );

        assertThat(response.getBody().message()).doesNotContain("secretToken");
    }

    @Test
    void IllegalStateException은_400을_돌려준다() {
        ResponseEntity<ApiErrorResponse> response = handler.handleIllegalState(
            new IllegalStateException("추천된 candidateId(CHICKEN-999)가 fixture 후보 목록에 없습니다.")
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().message()).contains("CHICKEN-999");
    }

    @Test
    void ResourceAccessException은_504를_돌려주고_원본_메시지를_노출하지_않는다() {
        ResponseEntity<ApiErrorResponse> response = handler.handleResourceAccess(
            new ResourceAccessException("Connection timed out to internal-host:4000")
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.GATEWAY_TIMEOUT);
        assertThat(response.getBody().code()).isEqualTo("SIMULATION_API_TIMEOUT");
        assertThat(response.getBody().message()).doesNotContain("internal-host");
    }

    @Test
    void 그_외_RestClientException은_502를_돌려주고_원본_메시지를_노출하지_않는다() {
        ResponseEntity<ApiErrorResponse> response = handler.handleRestClient(
            new RestClientException("500 Internal Server Error from Simulation API: {\"secret\":\"leak\"}")
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_GATEWAY);
        assertThat(response.getBody().code()).isEqualTo("SIMULATION_API_ERROR");
        assertThat(response.getBody().message()).doesNotContain("secret");
    }
}
