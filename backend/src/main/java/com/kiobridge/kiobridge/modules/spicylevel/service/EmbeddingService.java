package com.kiobridge.kiobridge.modules.spicylevel.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

@Service
@Profile("vector")
public class EmbeddingService {

    private final RestClient restClient;

    public EmbeddingService(
        @Value("${openai.api-key}") String apiKey,
        @Value("${openai.connect-timeout-ms:3000}") int connectTimeoutMs,
        @Value("${openai.read-timeout-ms:10000}") int readTimeoutMs
    ) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(connectTimeoutMs);
        requestFactory.setReadTimeout(readTimeoutMs);

        this.restClient = RestClient.builder()
            .baseUrl("https://api.openai.com/v1")
            .defaultHeader("Authorization", "Bearer " + apiKey)
            .requestFactory(requestFactory)
            .build();
    }

    public float[] embed(String text) {
        Map<String, Object> response = restClient.post()
            .uri("/embeddings")
            .contentType(MediaType.APPLICATION_JSON)
            .body(Map.of("model", "text-embedding-3-small", "input", text))
            .retrieve()
            .body(Map.class);

        List<Double> vector = (List<Double>) ((List<Map<String, Object>>) response.get("data")).get(0).get("embedding");
        float[] result = new float[vector.size()];
        for (int i = 0; i < vector.size(); i++) {
            result[i] = vector.get(i).floatValue();
        }
        return result;
    }
}