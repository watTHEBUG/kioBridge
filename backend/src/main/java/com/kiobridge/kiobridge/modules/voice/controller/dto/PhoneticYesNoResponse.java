package com.kiobridge.kiobridge.modules.voice.controller.dto;

import com.kiobridge.kiobridge.modules.voice.service.PhoneticYesNoMatchResult;

public record PhoneticYesNoResponse(
    boolean matched,
    String correctedTo
) {
    public static PhoneticYesNoResponse from(PhoneticYesNoMatchResult result) {
        return new PhoneticYesNoResponse(result.matched(), result.correctedTo());
    }
}
