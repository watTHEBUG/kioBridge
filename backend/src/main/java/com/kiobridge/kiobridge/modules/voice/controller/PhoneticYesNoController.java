package com.kiobridge.kiobridge.modules.voice.controller;

import com.kiobridge.kiobridge.modules.voice.controller.dto.PhoneticYesNoRequest;
import com.kiobridge.kiobridge.modules.voice.controller.dto.PhoneticYesNoResponse;
import com.kiobridge.kiobridge.modules.voice.service.PhoneticYesNoMatchingService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 신뢰도 게이트(자신없나())는 통과했지만 예/아니오 어느 쪽으로도 못 맞춘
 * 텍스트를, 이미 확인된 발음-혼동 anchor 와 자모 거리로 한 번 더 구제한다.
 * PhoneticYesNoMatchingService 주석 참고.
 */
@RestController
@RequestMapping("/internal/voice")
public class PhoneticYesNoController {

    private final PhoneticYesNoMatchingService matchingService;

    public PhoneticYesNoController(PhoneticYesNoMatchingService matchingService) {
        this.matchingService = matchingService;
    }

    /** POST /internal/voice/phonetic-yes-no — 텍스트를 받아 예/아니오 구제 매칭 결과를 반환한다. */
    @PostMapping("/phonetic-yes-no")
    public PhoneticYesNoResponse match(@Valid @RequestBody PhoneticYesNoRequest request) {
        return PhoneticYesNoResponse.from(matchingService.match(request.text()));
    }
}
