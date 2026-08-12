package com.kiobridge.kiobridge.modules.recommendation;

import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Stream;

@Component
public class ChickenStoreExclusionMessages {

    private static final String ALLERGEN_CONFLICT = "ALLERGEN_CONFLICT";

    private static final Map<String, String> TEMPLATES = Map.of(
            "PRICE_LIMIT_EXCEEDED",
            "설정하신 가격 한도를 넘어서 제외됐어요.",
            "CANDIDATE_UNAVAILABLE",
            "지금은 품절이라 제외됐어요."
    );

    private static final Map<String, String> ALLERGEN_NAMES = Map.of(
            "PEANUT", "땅콩",
            "SOY", "대두",
            "MILK", "우유",
            "EGG", "달걀",
            "WHEAT", "밀",
            "SHRIMP", "새우"
    );

    private static final String UNKNOWN_ALLERGEN_MESSAGE =
            "알레르기 조건과 겹쳐서 제외됐어요.";

    private static final String DEFAULT_MESSAGE =
            "선택하신 조건과 맞지 않아 제외됐어요.";

    public String resolve(
            String errorCode,
            Object sourceValue,
            Object candidateValue
    ) {
        if (ALLERGEN_CONFLICT.equals(errorCode)) {
            return resolveAllergenConflict(sourceValue, candidateValue);
        }

        return TEMPLATES.getOrDefault(errorCode, DEFAULT_MESSAGE);
    }

    private String resolveAllergenConflict(
            Object sourceValue,
            Object candidateValue
    ) {
        Set<String> candidateCodes = Set.copyOf(
                toCodes(candidateValue)
        );

        List<String> conflictingNames = toCodes(sourceValue).stream()
                .filter(candidateCodes::contains)
                .map(ALLERGEN_NAMES::get)
                .filter(Objects::nonNull)
                .distinct()
                .toList();

        if (conflictingNames.isEmpty()) {
            return UNKNOWN_ALLERGEN_MESSAGE;
        }

        return String.join("·", conflictingNames)
                + " 알레르기와 겹쳐서 제외됐어요.";
    }

    private static List<String> toCodes(Object rawValue) {
        if (rawValue == null) {
            return List.of();
        }

        Stream<?> values = rawValue instanceof Collection<?> collection
                ? collection.stream()
                : Stream.of(rawValue);

        return values
                .filter(Objects::nonNull)
                .map(ChickenStoreExclusionMessages::toCode)
                .filter(code -> !code.isBlank())
                .toList();
    }

    private static String toCode(Object value) {
        if (value instanceof Enum<?> enumValue) {
            return enumValue.name();
        }

        return String.valueOf(value)
                .trim()
                .toUpperCase(Locale.ROOT);
    }
}