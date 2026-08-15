package com.kiobridge.kiobridge.modules.spicylevel.service;

import com.kiobridge.kiobridge.modules.spicylevel.repository.SpicyLevelAnchorRepository;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Profile("vector")
public class SpicyLevelMatchingService {

    private static final int K = 5;
    private static final long CONFIDENCE_THRESHOLD = 3;

    private static final Set<String> NO_PREFERENCE_PHRASES = Set.of(
        "아무거나", "아무 거나", "아무 맛이나", "아무맛이나",
        "상관없어요", "상관없습니다", "상관없음",
        "다 좋아요", "다좋아요", "전부 괜찮아요", "다 괜찮아요"
    );
    private static final Set<String> MEDIUM_PHRASES = Set.of(
        "보통맛", "보통이요", "보통으로요", "그냥 보통", "보통으로"
    );
    private static final Set<String> EXCLUSION_MARKERS = Set.of(
        "싫", "말고", "아니", "보다", "이상", "이하"
    );

    // 부정어 — 있으면 "매운맛" 등 단어가 있어도 정반대 의미이므로 임베딩 매칭 전에 걸러낸다
    private static final Set<String> NEGATION_MARKERS = Set.of(
        "안 ", "안맵", "않", "말고", "빼고", "no", "not"
    );

    private final EmbeddingService embeddingService;
    private final SpicyLevelAnchorRepository repository;

    public SpicyLevelMatchingService(EmbeddingService embeddingService, SpicyLevelAnchorRepository repository) {
        this.embeddingService = embeddingService;
        this.repository = repository;
    }

    public SpicyLevelMatchResult match(String text) {
        String lower = text.toLowerCase();
        if (NEGATION_MARKERS.stream().anyMatch(lower::contains)) {
            List<String> candidates = List.of("MILD", "MEDIUM");
            String question = buildClarificationQuestion(text, candidates);
            return new SpicyLevelMatchResult(null, false, Map.of(), candidates, text, question);
        }

        if (matchesKeyword(text, NO_PREFERENCE_PHRASES)) {
            return new SpicyLevelMatchResult(
                "NO_PREFERENCE", true, Map.of(), List.of("NO_PREFERENCE"), text, null
            );
        }
        if (matchesKeyword(text, MEDIUM_PHRASES)) {
            return new SpicyLevelMatchResult(
                "MEDIUM", true, Map.of(), List.of("MEDIUM"), text, null
            );
        }

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
            return new SpicyLevelMatchResult(topLabels.get(0), true, counts, topLabels, text, null);
        }

        String question = buildClarificationQuestion(text, topLabels);
        return new SpicyLevelMatchResult(null, false, counts, topLabels, text, question);
    }

    private boolean matchesKeyword(String text, Set<String> phrases) {
        if (EXCLUSION_MARKERS.stream().anyMatch(text::contains)) {
            return false;
        }
        return phrases.stream().anyMatch(text::contains);
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
            case "MEDIUM" -> "보통맛";
            case "MILD" -> "순한맛";
            case "NO_PREFERENCE" -> "상관없음";
            default -> level;
        };
    }
}