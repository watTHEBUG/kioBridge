package com.kiobridge.kiobridge.modules.voice.service;

import com.kiobridge.kiobridge.common.web.ApiException;
import com.kiobridge.kiobridge.modules.voice.controller.dto.VoiceTranscriptionRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.Base64;
import java.util.Map;

@Service
public class VoiceTranscriptionService {

    private static final int MAX_AUDIO_BYTES = 600_000;

    private final RestClient restClient;
    private final String apiKey;
    private final String model;

    @Autowired
    public VoiceTranscriptionService(
        @Value("${openai.api-key:}") String apiKey,
        @Value("${openai.transcription-model:gpt-transcribe}") String model,
        @Value("${openai.connect-timeout-ms:3000}") int connectTimeoutMs,
        @Value("${openai.transcription-read-timeout-ms:12000}") int readTimeoutMs
    ) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(connectTimeoutMs);
        requestFactory.setReadTimeout(readTimeoutMs);

        this.restClient = RestClient.builder()
            .baseUrl("https://api.openai.com/v1")
            .requestFactory(requestFactory)
            .build();
        this.apiKey = apiKey.trim();
        this.model = model;
    }

    VoiceTranscriptionService(RestClient restClient, String apiKey, String model) {
        this.restClient = restClient;
        this.apiKey = apiKey;
        this.model = model;
    }

    public String transcribe(VoiceTranscriptionRequest request) {
        if (apiKey.isBlank()) {
            throw new ApiException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "VOICE_STT_NOT_CONFIGURED",
                "음성 인식 서버가 아직 설정되지 않았어요."
            );
        }

        byte[] audio = decode(request.audioBase64());
        if (audio.length == 0) {
            throw new ApiException("VOICE_AUDIO_EMPTY", "녹음된 소리가 없어요.");
        }
        if (audio.length > MAX_AUDIO_BYTES) {
            throw new ApiException(HttpStatus.PAYLOAD_TOO_LARGE, "VOICE_AUDIO_TOO_LARGE", "녹음이 너무 길어요.");
        }

        String contentType = request.mimeType().split(";", 2)[0];
        MediaType mediaType = MediaType.parseMediaType(contentType);
        String filename = "recording." + extension(contentType);
        ByteArrayResource resource = new ByteArrayResource(audio) {
            @Override
            public String getFilename() {
                return filename;
            }
        };

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("model", model);
        body.add("language", request.language().startsWith("ko") ? "ko" : "en");
        HttpHeaders fileHeaders = new HttpHeaders();
        fileHeaders.setContentType(mediaType);
        fileHeaders.setContentDispositionFormData("file", filename);
        body.add("file", new HttpEntity<>(resource, fileHeaders));

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restClient.post()
                .uri("/audio/transcriptions")
                .header("Authorization", "Bearer " + apiKey)
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(body)
                .retrieve()
                .body(Map.class);

            String text = response == null ? "" : String.valueOf(response.getOrDefault("text", "")).trim();
            if (text.isEmpty()) {
                throw new ApiException(HttpStatus.BAD_GATEWAY, "VOICE_STT_EMPTY", "말씀을 글로 바꾸지 못했어요.");
            }
            return text;
        } catch (ResourceAccessException e) {
            throw new ApiException(HttpStatus.GATEWAY_TIMEOUT, "VOICE_STT_TIMEOUT", "음성 인식 응답이 너무 늦어요.", e);
        } catch (RestClientException e) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "VOICE_STT_ERROR", "음성 인식 서비스와 통신하지 못했어요.", e);
        }
    }

    private byte[] decode(String value) {
        try {
            return Base64.getDecoder().decode(value);
        } catch (IllegalArgumentException e) {
            throw new ApiException("VOICE_AUDIO_INVALID", "녹음 데이터가 올바르지 않아요.", e);
        }
    }

    private String extension(String contentType) {
        return switch (contentType) {
            case "audio/ogg" -> "ogg";
            case "audio/mp4" -> "m4a";
            case "audio/mpeg" -> "mp3";
            case "audio/wav" -> "wav";
            default -> "webm";
        };
    }
}
