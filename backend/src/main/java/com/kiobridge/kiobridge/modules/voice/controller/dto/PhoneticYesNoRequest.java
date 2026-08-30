package com.kiobridge.kiobridge.modules.voice.controller.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PhoneticYesNoRequest(
    @NotBlank
    @Size(max = 200)
    String text
) {}
