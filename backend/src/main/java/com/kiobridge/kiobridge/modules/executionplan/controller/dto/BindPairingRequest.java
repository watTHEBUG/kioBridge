package com.kiobridge.kiobridge.modules.executionplan.controller.dto;

import com.kiobridge.kiobridge.common.web.ApiException;
import com.kiobridge.kiobridge.contracts.input.context.ChickenStoreSessionContext;
import com.kiobridge.kiobridge.contracts.input.profile.CanonicalProfile;

import java.util.Objects;

/** 최초 매핑에 사용한 정규화 입력을 pairing에 고정한다. */
public record BindPairingRequest(
    String pairingId,
    CanonicalProfile profile,
    ChickenStoreSessionContext sessionContext
) {
    public BindPairingRequest {
        if (pairingId == null || pairingId.isBlank()) {
            throw new ApiException("REQUIRED_FIELD_MISSING", "pairingId는 비어있을 수 없습니다.");
        }
        Objects.requireNonNull(profile, "profile");
        Objects.requireNonNull(sessionContext, "sessionContext");
    }
}
