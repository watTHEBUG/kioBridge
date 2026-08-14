package com.kiobridge.kiobridge.modules.executionplan.controller.dto;

public record BindPairingResponse(
    boolean bound // 프로필과 주문 조건이 pairing에 정상적으로 고정됐는지 여부
) {}
