package com.kiobridge.kiobridge.modules.executionplan.service;

import com.kiobridge.kiobridge.contracts.Candidate;

import java.util.List;
import java.util.Map;

/**
 * environments/chicken-store/option-groups.json 기반으로 그룹별 실제 option id를 고른다.
 * (STEP4의 RuleValueResolver/RuleOperatorComparator와 같은 위치의 "환경 데이터 해석" 계층)
 *
 * 우선순위:
 *  1) preferredId가 그 그룹에 실제로 존재하는 id면 그대로 사용
 *     (ServiceType/SpicyLevel/BoneType/CupOption enum 상수명이 option id와 1:1로 같다 —
 *      option-groups.json 확인 완료. 단 NO_PREFERENCE/UNKNOWN/NONE 은 유효 id가 아니므로
 *      호출부에서 null로 변환해서 넘긴다.)
 *  2) candidate.supportedOptions().get(groupId) 중 그 그룹에 실존하는 첫 값
 *  3) 그룹 정의의 첫 번째 option id (최종 폴백)
 */
final class ChickenStoreOptionResolver {

    private ChickenStoreOptionResolver() {
    }

    static String resolveOptionId(
        List<Map<String, Object>> optionGroups,
        String groupId,
        String preferredId,
        Candidate candidate
    ) {
        Map<String, Object> group = findGroup(optionGroups, groupId);
        if (group == null) {
            throw new IllegalStateException("optionGroups에 " + groupId + " 그룹이 없습니다.");
        }
        List<String> validIds = optionIds(group);
        if (validIds.isEmpty()) {
            throw new IllegalStateException(groupId + " 그룹에 옵션이 없습니다.");
        }
        if (preferredId != null && validIds.contains(preferredId)) {
            return preferredId;
        }
        for (String supportedId : supportedOptionIds(candidate, groupId)) {
            if (validIds.contains(supportedId)) {
                return supportedId;
            }
        }
        return validIds.get(0);
    }

    /** QUANTITY처럼 그룹 option에 "value"(숫자)가 별도로 붙어 있을 때 그 값으로 id를 찾는다. */
    static String resolveOptionIdByValue(List<Map<String, Object>> optionGroups, String groupId, Integer value) {
        if (value == null) {
            return null;
        }
        Map<String, Object> group = findGroup(optionGroups, groupId);
        if (group == null) {
            return null;
        }
        for (Map<String, Object> option : optionsOf(group)) {
            Object rawValue = option.get("value");
            if (rawValue instanceof Number number && number.intValue() == value) {
                return (String) option.get("id");
            }
        }
        return null;
    }

    private static Map<String, Object> findGroup(List<Map<String, Object>> optionGroups, String groupId) {
        for (Map<String, Object> group : optionGroups) {
            if (groupId.equals(group.get("groupId"))) {
                return group;
            }
        }
        return null;
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> optionsOf(Map<String, Object> group) {
        Object options = group.get("options");
        return options instanceof List<?> list ? (List<Map<String, Object>>) list : List.of();
    }

    private static List<String> optionIds(Map<String, Object> group) {
        return optionsOf(group).stream()
            .map(option -> (String) option.get("id"))
            .filter(java.util.Objects::nonNull)
            .toList();
    }

    private static List<String> supportedOptionIds(Candidate candidate, String groupId) {
        if (candidate.supportedOptions() == null) {
            return List.of();
        }
        return candidate.supportedOptions().getOrDefault(groupId, List.of());
    }
}
