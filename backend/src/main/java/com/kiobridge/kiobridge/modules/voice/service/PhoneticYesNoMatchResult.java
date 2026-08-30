package com.kiobridge.kiobridge.modules.voice.service;

public record PhoneticYesNoMatchResult(
    boolean matched,
    String correctedTo,
    String matchedAnchor,
    int distance
) {
    public static PhoneticYesNoMatchResult noMatch() {
        return new PhoneticYesNoMatchResult(false, null, null, -1);
    }
}
