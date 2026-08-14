package com.kiobridge.kiobridge.modules.spicylevel.controller;

import com.kiobridge.kiobridge.modules.spicylevel.service.SpicyLevelMatchResult;
import com.kiobridge.kiobridge.modules.spicylevel.service.SpicyLevelMatchingService;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/internal/spicy-level")
@Profile("vector")
public class SpicyLevelController {

    private final SpicyLevelMatchingService matchingService;

    public SpicyLevelController(SpicyLevelMatchingService matchingService) {
        this.matchingService = matchingService;
    }

    /** POST /internal/spicy-level/match — 텍스트를 받아 맵기(HOT/MEDIUM/MILD) 매칭 결과를 반환한다. */
    @PostMapping("/match")
    public SpicyLevelMatchResult match(@RequestBody SpicyLevelMatchRequest request) {
        return matchingService.match(request.text());
    }
}