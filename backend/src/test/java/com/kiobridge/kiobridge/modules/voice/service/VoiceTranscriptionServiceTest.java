package com.kiobridge.kiobridge.modules.voice.service;

import com.kiobridge.kiobridge.common.web.ApiException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import org.springframework.web.multipart.MultipartFile;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.http.HttpMethod.POST;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class VoiceTranscriptionServiceTest {

    private static final String BASE_URL = "https://api.openai.com/v1";

    private MockRestServiceServer server;
    private VoiceTranscriptionService service;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder().baseUrl(BASE_URL);
        server = MockRestServiceServer.bindTo(builder).build();
        service = new VoiceTranscriptionService(true, builder.build());
    }

    private MultipartFile 오디오() {
        return new MockMultipartFile("audio", "clip.webm", "audio/webm", new byte[]{1, 2, 3});
    }

    /*
     * 아래 fixture 들은 실제 Whisper verbose_json 처럼 segments 를 함께 준다.
     *
     * transcribe() 는 response_format=verbose_json 을 요청하고, 신뢰도 게이트
     * (자신없나())가 segments[].avg_logprob/no_speech_prob 를 본다. segments 가
     * 아예 없으면 "모델이 말소리 자체를 못 찾은 것"으로 보고 무조건 버린다
     * (아래 세그먼트가_없으면_빈_문자열을_돌려준다 참고) — 그래서 text 만 있고
     * segments 가 없는 fixture 로는 이 서비스가 이제 늘 "" 를 돌려준다. 실제
     * 응답은 항상 segments 를 포함하므로, fixture 도 그 모양을 맞춘다.
     */
    private static final String 자신있는세그먼트 = """
            , "segments": [ { "avg_logprob": -0.2, "no_speech_prob": 0.05 } ]
            """;

    @Test
    void 인식에_성공하면_텍스트를_돌려준다() {
        server.expect(requestTo(BASE_URL + "/audio/transcriptions"))
                .andExpect(method(POST))
                .andRespond(withSuccess("""
                        { "text": "네" %s }
                        """.formatted(자신있는세그먼트), MediaType.APPLICATION_JSON));

        String result = service.transcribe(오디오(), "ko-KR");

        assertThat(result).isEqualTo("네");
        server.verify();
    }

    @Test
    void 앞뒤_공백은_잘라서_돌려준다() {
        server.expect(requestTo(BASE_URL + "/audio/transcriptions"))
                .andRespond(withSuccess("""
                        { "text": "  네  " %s }
                        """.formatted(자신있는세그먼트), MediaType.APPLICATION_JSON));

        assertThat(service.transcribe(오디오(), "ko-KR")).isEqualTo("네");
    }

    @Test
    void 세그먼트가_없으면_빈_문자열을_돌려준다() {
        // verbose_json 인데 segments 가 아예 없다 — 모델이 말소리 자체를 못 찾은 경우.
        server.expect(requestTo(BASE_URL + "/audio/transcriptions"))
                .andRespond(withSuccess("""
                        { "text": "안녕" }
                        """, MediaType.APPLICATION_JSON));

        assertThat(service.transcribe(오디오(), "ko-KR")).isEqualTo("");
    }

    @Test
    void 평균로그확률이_낮으면_글자가_있어도_버린다() {
        // avg_logprob 가 -1.0 보다 낮다(더 자신 없다) — "안녕" 이 "아니오" 의
        // 오인식이었던 실제 사례를 이렇게 재현했다.
        server.expect(requestTo(BASE_URL + "/audio/transcriptions"))
                .andRespond(withSuccess("""
                        { "text": "안녕", "segments": [ { "avg_logprob": -1.5, "no_speech_prob": 0.05 } ] }
                        """, MediaType.APPLICATION_JSON));

        assertThat(service.transcribe(오디오(), "ko-KR")).isEqualTo("");
    }

    @Test
    void 무음확률이_높으면_글자가_있어도_버린다() {
        // no_speech_prob 가 0.6 보다 높다 — 모델 스스로 "이 구간은 말이 아니었다" 고 본 것.
        server.expect(requestTo(BASE_URL + "/audio/transcriptions"))
                .andRespond(withSuccess("""
                        { "text": "안녕", "segments": [ { "avg_logprob": -0.2, "no_speech_prob": 0.8 } ] }
                        """, MediaType.APPLICATION_JSON));

        assertThat(service.transcribe(오디오(), "ko-KR")).isEqualTo("");
    }

    @Test
    void 세그먼트가_여럿이면_하나라도_자신없으면_버린다() {
        server.expect(requestTo(BASE_URL + "/audio/transcriptions"))
                .andRespond(withSuccess("""
                        { "text": "안녕", "segments": [
                            { "avg_logprob": -0.1, "no_speech_prob": 0.02 },
                            { "avg_logprob": -1.5, "no_speech_prob": 0.02 }
                        ] }
                        """, MediaType.APPLICATION_JSON));

        assertThat(service.transcribe(오디오(), "ko-KR")).isEqualTo("");
    }

    @Test
    void 브라우저가_보낸_형식대로_확장자를_붙인다() {
        /*
         * Whisper 는 파일 확장자로 컨테이너 형식을 판별한다.
         *
         * Safari 는 MediaRecorder 에서 webm 을 아예 지원하지 않아 audio/mp4 로만
         * 녹음한다. 여기서 이름을 clip.webm 으로 덮으면 m4a 바이트가 webm 으로
         * 위장돼 형식 불일치로 거절당하고, iOS 사용자는 음성 주문을 통째로 못 쓴다.
         */
        server.expect(requestTo(BASE_URL + "/audio/transcriptions"))
                .andExpect(content().string(containsString("filename=\"clip.m4a\"")))
                .andRespond(withSuccess("""
                        { "text": "네" }
                        """, MediaType.APPLICATION_JSON));

        service.transcribe(
                new MockMultipartFile("audio", "clip.m4a", "audio/mp4", new byte[]{1, 2, 3}), "ko-KR");

        server.verify();
    }

    @Test
    void 모르는_확장자는_믿지_않고_webm_으로_떨어뜨린다() {
        // 프론트가 준 이름을 그대로 믿지 않겠다는 원래 의도는 지킨다.
        // 아는 것만 받고, 나머지는 기본값으로 간다.
        server.expect(requestTo(BASE_URL + "/audio/transcriptions"))
                .andExpect(content().string(containsString("filename=\"clip.webm\"")))
                .andRespond(withSuccess("""
                        { "text": "네" }
                        """, MediaType.APPLICATION_JSON));

        service.transcribe(
                new MockMultipartFile("audio", "clip.exe", "application/octet-stream", new byte[]{1, 2, 3}), "ko-KR");

        server.verify();
    }

    @Test
    void 이름이_없어도_webm_으로_보낸다() {
        // 이름을 안 붙이는 옛 프론트나 직접 부르는 요청이 여기 온다.
        server.expect(requestTo(BASE_URL + "/audio/transcriptions"))
                .andExpect(content().string(containsString("filename=\"clip.webm\"")))
                .andRespond(withSuccess("""
                        { "text": "네" }
                        """, MediaType.APPLICATION_JSON));

        service.transcribe(
                new MockMultipartFile("audio", null, "audio/webm", new byte[]{1, 2, 3}), "ko-KR");

        server.verify();
    }

    @Test
    void 오디오가_비어있으면_바로_거부하고_외부로_안_나간다() {
        MultipartFile 빈것 = new MockMultipartFile("audio", "clip.webm", "audio/webm", new byte[0]);

        assertThatThrownBy(() -> service.transcribe(빈것, "ko-KR"))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).code()).isEqualTo("STT_EMPTY_AUDIO"));

        // 위 기대(expect)를 하나도 안 걸었으니, 실제로 호출됐다면 아래에서 걸린다.
        server.verify();
    }

    @Test
    void API키가_없으면_외부로_나가지_않고_바로_알려준다() {
        VoiceTranscriptionService 키없음 =
                new VoiceTranscriptionService(false, RestClient.builder().baseUrl(BASE_URL).build());

        assertThatThrownBy(() -> 키없음.transcribe(오디오(), "ko-KR"))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> {
                    ApiException api = (ApiException) e;
                    assertThat(api.code()).isEqualTo("STT_NOT_CONFIGURED");
                    assertThat(api.status()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
                });
    }

    @Test
    void 외부_API가_5xx로_응답하면_STT_API_ERROR로_감싼다() {
        server.expect(requestTo(BASE_URL + "/audio/transcriptions"))
                .andRespond(withServerError());

        assertThatThrownBy(() -> service.transcribe(오디오(), "ko-KR"))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> {
                    ApiException api = (ApiException) e;
                    assertThat(api.code()).isEqualTo("STT_API_ERROR");
                    assertThat(api.status()).isEqualTo(HttpStatus.BAD_GATEWAY);
                });
    }

    @Test
    void 연결_자체가_안되면_STT_API_TIMEOUT으로_감싼다() {
        // 존재하지 않는 포트로 보내 ResourceAccessException 을 직접 유도한다 —
        // MockRestServiceServer 는 성공/실패 응답만 흉내 내지, 연결 실패(응답 자체가
        // 없는 경우)는 흉내 내지 못한다.
        RestClient 연결안됨 = RestClient.builder()
                .baseUrl("http://127.0.0.1:1")
                .build();
        VoiceTranscriptionService 서비스 = new VoiceTranscriptionService(true, 연결안됨);

        assertThatThrownBy(() -> 서비스.transcribe(오디오(), "ko-KR"))
                .isInstanceOf(ApiException.class)
                .satisfies(e -> {
                    ApiException api = (ApiException) e;
                    assertThat(api.code()).isEqualTo("STT_API_TIMEOUT");
                    assertThat(api.status()).isEqualTo(HttpStatus.GATEWAY_TIMEOUT);
                });
    }
}
