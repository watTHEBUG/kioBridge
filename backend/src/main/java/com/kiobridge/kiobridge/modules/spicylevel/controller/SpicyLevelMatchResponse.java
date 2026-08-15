package com.kiobridge.kiobridge.modules.spicylevel.controller;

import com.kiobridge.kiobridge.modules.spicylevel.service.SpicyLevelMatchResult;

import java.util.List;

public record SpicyLevelMatchResponse(
    boolean confident,
    String matchedLevel,
    String heardText,
    List<String> candidates,
    String clarificationQuestion
) {
    public static SpicyLevelMatchResponse from(SpicyLevelMatchResult result) {
        return new SpicyLevelMatchResponse(
            result.confident(),
            result.matchedLevel(),
            result.heardText(),
            result.candidates(),
            result.clarificationQuestion()
        );
    }
}