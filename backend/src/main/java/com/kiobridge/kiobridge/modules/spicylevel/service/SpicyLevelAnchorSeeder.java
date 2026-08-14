package com.kiobridge.kiobridge.modules.spicylevel.service;

import com.kiobridge.kiobridge.modules.spicylevel.repository.SpicyLevelAnchorRepository;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Set;

@Component
@Profile("vector")
public class SpicyLevelAnchorSeeder implements ApplicationRunner {

    private final EmbeddingService embeddingService;
    private final SpicyLevelAnchorRepository repository;

    public SpicyLevelAnchorSeeder(EmbeddingService embeddingService, SpicyLevelAnchorRepository repository) {
        this.embeddingService = embeddingService;
        this.repository = repository;
    }

    @Override
    public void run(ApplicationArguments args) {
        Set<String> existing = repository.findAllExpressions();

        for (Map.Entry<String, String> anchor : SpicyLevelAnchorData.ANCHORS) {
            if (existing.contains(anchor.getKey())) {
                continue;
            }
            float[] vector = embeddingService.embed(anchor.getKey());
            String literal = VectorFormatter.toPgVectorLiteral(vector);
            repository.insertWithEmbedding(anchor.getKey(), anchor.getValue(), literal);
        }
    }
}