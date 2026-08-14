package com.kiobridge.kiobridge.modules.voice.service;

import com.kiobridge.kiobridge.common.web.ApiException;
import com.kiobridge.kiobridge.modules.voice.controller.dto.VoiceTranscriptionRequest;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class VoiceTranscriptionServiceTest {

    @Test
    void 키가_없으면_외부로_요청하지_않는다() {
        VoiceTranscriptionService service = new VoiceTranscriptionService(
            RestClient.create(), "", "gpt-transcribe"
        );

        assertThatThrownBy(() -> service.transcribe(request(new byte[]{1, 2, 3})))
            .isInstanceOfSatisfying(ApiException.class, e -> {
                assertThat(e.status().value()).isEqualTo(503);
                assertThat(e.code()).isEqualTo("VOICE_STT_NOT_CONFIGURED");
            });
    }

    @Test
    void 잘못된_base64를_거절한다() {
        VoiceTranscriptionService service = new VoiceTranscriptionService(
            RestClient.create(), "test-key", "gpt-transcribe"
        );

        assertThatThrownBy(() -> service.transcribe(
            new VoiceTranscriptionRequest("%%%", "audio/webm", "ko-KR")
        )).isInstanceOfSatisfying(ApiException.class,
            e -> assertThat(e.code()).isEqualTo("VOICE_AUDIO_INVALID"));
    }

    @Test
    void 오픈에이아이의_전사문을_반환한다() {
        RestClient.Builder builder = RestClient.builder().baseUrl("https://api.openai.com/v1");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        VoiceTranscriptionService service = new VoiceTranscriptionService(
            builder.build(), "test-key", "gpt-transcribe"
        );
        server.expect(requestTo("https://api.openai.com/v1/audio/transcriptions"))
            .andExpect(method(HttpMethod.POST))
            .andExpect(header("Authorization", "Bearer test-key"))
            .andRespond(withSuccess("{\"text\":\"매운맛\"}", MediaType.APPLICATION_JSON));

        assertThat(service.transcribe(request(new byte[]{1, 2, 3}))).isEqualTo("매운맛");
        server.verify();
    }

    private VoiceTranscriptionRequest request(byte[] audio) {
        return new VoiceTranscriptionRequest(
            Base64.getEncoder().encodeToString(audio), "audio/webm;codecs=opus", "ko-KR"
        );
    }
}
