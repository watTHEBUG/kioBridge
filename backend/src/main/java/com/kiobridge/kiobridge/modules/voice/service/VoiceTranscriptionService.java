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
import java.util.Locale;
import java.util.Map;
import java.util.Set;

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

        /*
         * 파일 이름은 확장자만 쓴다. Whisper 는 그것으로 컨테이너 형식을 판별한다.
         *
         * 예전에는 "clip.webm" 으로 고정했다. 브라우저가 붙인 이름을 그대로
         * 믿지 않겠다는 뜻이었고 그 판단 자체는 옳다 — 다만 **모든 브라우저가
         * webm 을 만든다는 전제**가 틀렸다.
         *
         * Safari 는 MediaRecorder 에서 webm 을 아예 지원하지 않아 audio/mp4 로만
         * 녹음한다. 프론트도 그걸 알고 형식에 맞춰 이름을 붙여 보내는데
         * (listen.ts 의 확장자()), 여기서 덮어쓰면 m4a 바이트가 .webm 이름을 달고
         * 나간다. Whisper 는 형식 불일치로 거절하고, **iOS 사용자는 음성 주문을
         * 아예 못 쓰게 된다.**
         *
         * 그래서 믿지 않되 버리지도 않는다 — 프론트가 보낸 확장자를 쓰되 아는
         * 것만 받고, 모르면 webm 으로 떨어뜨린다. 경로나 특수문자가 섞여 들어올
         * 자리도 없다(확장자만 떼어 쓰므로).
         */
        String 파일명 = "clip." + 아는확장자(audio.getOriginalFilename());
        ByteArrayResource file = new ByteArrayResource(bytes) {
            @Override
            public String getFilename() {
                return 파일명;
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

    /**
     * OpenAI 가 받는 형식만 추린 목록.
     *
     * 여기 없는 것을 넘기면 어차피 거절당하므로, 모르는 확장자는 webm 으로
     * 떨어뜨린다 — 프론트가 형식을 안 알려 준 옛 판이나, 이름 없이 온 요청이
     * 그 경우다.
     */
    private static final Set<String> 아는확장자 =
        Set.of("webm", "ogg", "oga", "m4a", "mp4", "mp3", "mpga", "wav", "flac");

    /** 보낸 이름에서 확장자만 떼어 온다. 아는 것이 아니면 webm 으로 본다. */
    private static String 아는확장자(String 원래이름) {
        if (원래이름 == null) return "webm";
        int 점 = 원래이름.lastIndexOf('.');
        if (점 < 0 || 점 == 원래이름.length() - 1) return "webm";
        String 확장 = 원래이름.substring(점 + 1).toLowerCase(Locale.ROOT);
        return 아는확장자.contains(확장) ? 확장 : "webm";
    }

    private static String 짧게(String language) {
        if (language == null) return null;
        String t = language.trim();
        if (t.length() < 2) return null;
        return t.substring(0, 2).toLowerCase();
    }
}
