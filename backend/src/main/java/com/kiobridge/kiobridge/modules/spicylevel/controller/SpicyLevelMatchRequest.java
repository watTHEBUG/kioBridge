package com.kiobridge.kiobridge.modules.spicylevel.controller;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SpicyLevelMatchRequest(
    @NotBlank
    @Size(max = 100)
    String text
) {}