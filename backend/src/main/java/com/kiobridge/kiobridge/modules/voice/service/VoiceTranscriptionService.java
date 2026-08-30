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
import java.util.List;
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
        /*
         * 짧은 부정어("아니오")를 전혀 다른 흔한 낱말("안녕")로 통째로 잘못 듣는
         * 사례를 실제로 겪고 나서 넣은 세 가지다. 문제를 셋으로 나눠서 봤다 —
         * ① 애초에 헷갈릴 확률을 줄인다, ② 그래도 헷갈리면 모델 스스로 얼마나
         * 자신 없어 하는지를 받아서 본다, ③ 자신 없으면 그 글자가 무엇이든
         * 버리고 "못 들음"으로 되돌린다. 텍스트를 아무리 잘 매칭해도(예아니오())
         * ①②③ 이전 단계에서 이미 다른 낱말로 굳어 버리면 소용이 없다.
         */
        // ① 예상 어휘를 미리 준다. 지금 이 서비스가 화면 문맥(지금 이 질문이
        // 예/아니오인지)을 모르므로, 실제로 오인식이 재현된 낱말만 좁게 준다 —
        // 너무 많은 어휘를 얹으면 그쪽으로 기우는 힘이 옅어진다.
        String 힌트 = 힌트(짧은언어);
        if (힌트 != null) form.add("prompt", 힌트);
        // ③ 임계값 판정에 쓸 신뢰도 지표(avg_logprob·no_speech_prob)는
        // response_format 을 verbose_json 으로 바꿔야 세그먼트 단위로 온다.
        // 기본값(json)은 text 하나만 준다.
        form.add("response_format", "verbose_json");
        // ② temperature 를 0 으로 고정한다. 기본값은 낮은 확신 구간에서 표본을
        // 뽑아(sampling) 매번 다른 답을 지어낼 여지를 준다 — 같은 오디오를
        // 다시 보내도 "안녕"·"응"·"그래" 처럼 매번 다르게 나온 것도 그 때문일
        // 가능성이 크다. 0 이면 매번 가장 그럴듯한 하나로 고정해서 반복 가능하게
        // 만든다(그 하나가 여전히 틀릴 수는 있다 — 그건 ③ 이 받는다).
        form.add("temperature", "0");

        try {
            Map<String, Object> response = restClient.post()
                .uri("/audio/transcriptions")
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(form)
                .retrieve()
                .body(Map.class);
            if (response == null) return "";
            Object text = response.get("text");
            String 글 = text == null ? "" : text.toString().trim();
            if (글.isEmpty()) return "";
            // ③ 모델 스스로 자신 없다고 답한 것은 텍스트가 무엇이든 버린다.
            if (자신없나(response)) return "";
            return 글;
        } catch (ResourceAccessException e) {
            throw new ApiException(HttpStatus.GATEWAY_TIMEOUT, "STT_API_TIMEOUT", "음성 인식 서버 응답이 늦어요.", e);
        } catch (RestClientException e) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "STT_API_ERROR", "음성 인식에 실패했어요.", e);
        }
    }

    /*
     * ── ① 예상 어휘 힌트 ────────────────────────────────────────────────────
     *
     * "아니오" 계열이 실제로 "안녕"으로 통째로 잘못 들린 사례를 재현·확인하고
     * 넣었다. 다른 낱말(메뉴 이름 등)까지 욕심내지 않는다 — 이 서비스는 지금
     * 이 오디오가 어떤 질문에 대한 답인지 모르므로, 힌트가 길어질수록 특정
     * 낱말로 기우는 효과가 흐려진다. 지금 재현된 것만 좁게 준다.
     *
     * 모르는 언어에는 안 준다. 엉뚱한 언어의 어휘로 기울이면 없느니만 못하다.
     */
    private static final String 한국어힌트 = "네. 아니요.";
    private static final String 영어힌트 = "Yes. No.";

    private static String 힌트(String 짧은언어) {
        if (짧은언어 == null) return null;
        if ("ko".equals(짧은언어)) return 한국어힌트;
        if ("en".equals(짧은언어)) return 영어힌트;
        return null;
    }

    /*
     * ── ③ 신뢰도 게이트 ─────────────────────────────────────────────────────
     *
     * verbose_json 의 segments[].avg_logprob(낮을수록 자신 없음)·
     * no_speech_prob(높을수록 "이 구간은 말이 아니었다" 는 모델 자신의 판단)을
     * 본다. 세그먼트가 여러 개면 그중 하나라도 이 문턱을 넘으면 전체를
     * 못 믿는다 — 답 하나짜리 짧은 문장에서 한 조각만 자신 없어도 그 조각이
     * 곧 전체인 경우가 많다.
     *
     * 임계값은 지금은 어림값이다. VoiceCorrectionLogService 가 쌓는 "실제로
     * 오인식됐다가 사람이 고쳐 누른" 사례들을 나중에 보고 다시 잡을 자리로
     * 남겨 둔다.
     */
    private static final double 최소평균로그확률 = -1.0;
    private static final double 최대무음확률 = 0.6;

    /*
     * 세그먼트 하나하나가 "믿을 만한 모양"인지부터 본다.
     *
     * 처음엔 avg_logprob·no_speech_prob 가 없거나 숫자가 아니면 그 조건을
     * 그냥 건너뛰었다(null 이면 어느 if 도 안 걸림) — 그러면 segments: [{}]
     * 처럼 지표 자체가 빠진 응답도 "걸리는 게 없으니" 자신 있음으로 통과했다.
     * 신뢰도를 아예 못 읽은 것과 신뢰도가 높은 것은 다르다 — 후자만 믿어야
     * 하므로, 모양이 안 맞거나 지표가 없으면 못 믿는 쪽(true)으로 떨어뜨린다.
     * segments 가 아예 없을 때와 같은 태도다(바로 위 분기).
     */
    @SuppressWarnings("unchecked")
    private static boolean 자신없나(Map<String, Object> response) {
        Object segments = response.get("segments");
        if (!(segments instanceof List<?> 목록) || 목록.isEmpty()) {
            // verbose_json 인데 세그먼트가 아예 없다 — 모델이 말소리 자체를 못 찾은 것.
            return true;
        }
        for (Object item : 목록) {
            if (!(item instanceof Map<?, ?> 세그먼트)) return true;
            Double 평균로그확률 = 숫자(((Map<String, Object>) 세그먼트).get("avg_logprob"));
            Double 무음확률 = 숫자(((Map<String, Object>) 세그먼트).get("no_speech_prob"));
            if (평균로그확률 == null || 무음확률 == null) return true;
            if (평균로그확률 < 최소평균로그확률) return true;
            if (무음확률 > 최대무음확률) return true;
        }
        return false;
    }

    private static Double 숫자(Object v) {
        return v instanceof Number n ? n.doubleValue() : null;
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
