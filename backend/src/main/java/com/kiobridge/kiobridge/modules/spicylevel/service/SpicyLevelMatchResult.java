package com.kiobridge.kiobridge.modules.spicylevel.service;

import java.util.Map;

public record SpicyLevelMatchResult(
    String matchedLevel,        // 확정된 경우만 값 있음, 애매하면 null
    boolean confident,          // 3표 이상 확보했는지
    Map<String, Long> voteBreakdown,  // {"HOT":2, "MEDIUM":2, "MILD":1}
    String clarificationQuestion      // 애매할 때만 값 있음, 확정이면 null
) {}