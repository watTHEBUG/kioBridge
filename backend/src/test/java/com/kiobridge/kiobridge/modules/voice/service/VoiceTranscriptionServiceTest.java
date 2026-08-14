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

    @Test
    void 인식에_성공하면_텍스트를_돌려준다() {
        server.expect(requestTo(BASE_URL + "/audio/transcriptions"))
                .andExpect(method(POST))
                .andRespond(withSuccess("""
                        { "text": "네" }
                        """, MediaType.APPLICATION_JSON));

        String result = service.transcribe(오디오(), "ko-KR");

        assertThat(result).isEqualTo("네");
        server.verify();
    }

    @Test
    void 앞뒤_공백은_잘라서_돌려준다() {
        server.expect(requestTo(BASE_URL + "/audio/transcriptions"))
                .andRespond(withSuccess("""
                        { "text": "  네  " }
                        """, MediaType.APPLICATION_JSON));

        assertThat(service.transcribe(오디오(), "ko-KR")).isEqualTo("네");
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
