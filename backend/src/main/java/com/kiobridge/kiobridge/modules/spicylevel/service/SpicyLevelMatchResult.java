package com.kiobridge.kiobridge.modules.spicylevel.service;

import java.util.List;
import java.util.Map;

public record SpicyLevelMatchResult(
    String matchedLevel,
    boolean confident,
    Map<String, Long> voteBreakdown,
    List<String> candidates,
    String heardText,
    String clarificationQuestion
) {}