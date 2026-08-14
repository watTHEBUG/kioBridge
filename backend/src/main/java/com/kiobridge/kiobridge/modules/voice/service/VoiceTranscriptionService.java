package com.kiobridge.kiobridge.modules.voice.service;

import com.kiobridge.kiobridge.common.web.ApiException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

/**
 * 음성을 글로 바꾼다.
 *
 * frontend/src/api/listen.ts 가 쓰던 브라우저 내장 SpeechRecognition 이 일부
 * 기기·언어 조합(특히 한국어)에서 onresult/onerror/onend 어느 것도 안 부르고
 * 그대로 멈추는 것을 직접 재현·확인했다 — 영어는 되고 한국어만 매번 안 됐다.
 * 크롬 자체 버그로 보이는데 코드로는 더 못 좁혀서, 우회로 오디오를 서버로 보내
 * OpenAI Whisper 로 인식하기로 했다.
 *
 * 오디오는 저장하지 않는다. 킷 문서(PARTICIPANT_IDEA_CATALOG.md "음성 주문"
 * 항목)가 "음성 원본을 서버에 저장하지 마세요. 인식 결과만 씁니다" 라고 못박아
 * 뒀다 — 받은 바이트를 메모리에서 바로 OpenAI 로 넘기고, 디스크나 DB 어디에도
 * 쓰지 않는다. 요청이 끝나면 배열도 같이 사라진다.
 */
@Service
public class VoiceTranscriptionService {

    private final RestClient restClient;
    private final boolean 준비됨;

    @Autowired
    public VoiceTranscriptionService(
        @Value("${openai.api-key:}") String apiKey,
        @Value("${openai.stt.connect-timeout-ms:5000}") int connectTimeoutMs,
        @Value("${openai.stt.read-timeout-ms:15000}") int readTimeoutMs
    ) {
        this(
            apiKey != null && !apiKey.isBlank(),
            빌드(apiKey, connectTimeoutMs, readTimeoutMs)
        );
    }

    /**
     * 테스트 전용 자리. MockRestServiceServer 로 만든 RestClient 를 직접 넣어
     * HTTP 계층까지 그대로 검증할 수 있다(SimulationApiClientTest 와 같은 방식).
     * 실제 스프링 빈 등록에는 위 생성자만 쓰인다.
     */
    VoiceTranscriptionService(boolean 준비됨, RestClient restClient) {
        this.준비됨 = 준비됨;
        this.restClient = restClient;
    }

    private static RestClient 빌드(String apiKey, int connectTimeoutMs, int readTimeoutMs) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(connectTimeoutMs);
        requestFactory.setReadTimeout(readTimeoutMs);

        boolean 준비됨 = apiKey != null && !apiKey.isBlank();
        // 키가 없어도 앱은 뜬다. 대신 transcribe() 를 부르는 순간 명확한
        // 에러(STT_NOT_CONFIGURED)로 답한다 — 시작조차 못 하는 것보다 낫다.
        return RestClient.builder()
            .baseUrl("https://api.openai.com/v1")
            .defaultHeader("Authorization", "Bearer " + (준비됨 ? apiKey : "미설정"))
            .requestFactory(requestFactory)
            .build();
    }

    /**
     * @param language BCP-47 태그(예: "ko-KR"). Whisper 는 ISO-639-1 두 글자만
     *                  받으므로 앞 두 글자만 잘라 보낸다. 비어 있으면 언어 힌트
     *                  없이 보낸다 — Whisper 가 알아서 감지한다.
     */
    public String transcribe(MultipartFile audio, String language) {
        if (!준비됨) {
            throw new ApiException(
                HttpStatus.SERVICE_UNAVAILABLE, "STT_NOT_CONFIGURED",
                "음성 인식이 설정되어 있지 않아요. 서버에 OPENAI_API_KEY 가 없어요."
            );
        }
        if (audio == null || audio.isEmpty()) {
            throw new ApiException("STT_EMPTY_AUDIO", "받은 오디오가 비어 있어요.");
        }

        byte[] bytes;
        try {
            bytes = audio.getBytes();
        } catch (IOException e) {
            throw new ApiException("STT_AUDIO_READ_FAILED", "오디오를 읽지 못했어요.", e);
        }

        // 파일 이름은 여기서 고정한다. 브라우저가 붙인 이름을 그대로 실어 보내면
        // 프론트가 주는 값을 신뢰하는 셈이 된다 — Whisper 가 형식을 알아보려면
        // 확장자만 있으면 되므로, 실제 인코딩(webm/opus)에 맞는 이름 하나로 고정.
        ByteArrayResource file = new ByteArrayResource(bytes) {
            @Override
            public String getFilename() {
                return "clip.webm";
            }
        };

        MultiValueMap<String, Object> form = new LinkedMultiValueMap<>();
        form.add("file", file);
        form.add("model", "whisper-1");
        String 짧은언어 = 짧게(language);
        if (짧은언어 != null) form.add("language", 짧은언어);

        try {
            Map<String, Object> response = restClient.post()
                .uri("/audio/transcriptions")
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(form)
                .retrieve()
                .body(Map.class);
            Object text = response == null ? null : response.get("text");
            return text == null ? "" : text.toString().trim();
        } catch (ResourceAccessException e) {
            throw new ApiException(HttpStatus.GATEWAY_TIMEOUT, "STT_API_TIMEOUT", "음성 인식 서버 응답이 늦어요.", e);
        } catch (RestClientException e) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "STT_API_ERROR", "음성 인식에 실패했어요.", e);
        }
    }

    private static String 짧게(String language) {
        if (language == null) return null;
        String t = language.trim();
        if (t.length() < 2) return null;
        return t.substring(0, 2).toLowerCase();
    }
}
