package com.kiobridge.kiobridge.modules.spicylevel.service;

import com.kiobridge.kiobridge.modules.spicylevel.repository.SpicyLevelAnchorRepository;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Profile("vector")
public class SpicyLevelMatchingService {

    private static final int K = 5;
    private static final long CONFIDENCE_THRESHOLD = 3;

    private final EmbeddingService embeddingService;
    private final SpicyLevelAnchorRepository repository;

    public SpicyLevelMatchingService(EmbeddingService embeddingService, SpicyLevelAnchorRepository repository) {
        this.embeddingService = embeddingService;
        this.repository = repository;
    }

    public SpicyLevelMatchResult match(String text) {
        float[] vector = embeddingService.embed(text);
        String literal = VectorFormatter.toPgVectorLiteral(vector);
        List<String> nearest = repository.findNearestSpicyLevels(literal, K);

        Map<String, Long> counts = nearest.stream()
            .collect(Collectors.groupingBy(level -> level, Collectors.counting()));

        long maxVotes = counts.values().stream()
            .max(Long::compare)
            .orElseThrow(() -> new IllegalStateException("anchor 데이터가 없습니다."));

        List<String> topLabels = counts.entrySet().stream()
            .filter(e -> e.getValue() == maxVotes)
            .map(Map.Entry::getKey)
            .sorted()
            .toList();

        if (topLabels.size() == 1 && maxVotes >= CONFIDENCE_THRESHOLD) {
            return new SpicyLevelMatchResult(topLabels.get(0), true, counts, null);
        }

        String question = buildClarificationQuestion(text, topLabels);
        return new SpicyLevelMatchResult(null, false, counts, question);
    }

    private String buildClarificationQuestion(String text, List<String> candidates) {
        String labels = candidates.stream()
            .map(this::toKorean)
            .collect(Collectors.joining(" 또는 "));
        return "\"" + text + "\"은(는) " + labels + "인가요?";
    }

    private String toKorean(String level) {
        return switch (level) {
            case "HOT" -> "매운맛";
            case "MEDIUM" -> "중간맛";
            case "MILD" -> "순한맛";
            default -> level;
        };
    }
}