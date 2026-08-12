package com.kiobridge.kiobridge.modules.member.controller;

import com.kiobridge.kiobridge.common.web.ApiException;
import com.kiobridge.kiobridge.modules.member.controller.dto.SaveProfileRequest;
import com.kiobridge.kiobridge.modules.member.controller.dto.UserProfileResponse;
import com.kiobridge.kiobridge.modules.member.service.SessionTokenService;
import com.kiobridge.kiobridge.modules.member.service.UserProfileService;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Objects;

@RestController
@RequestMapping("/api/v1/users/{userId}/profiles")
public class UserProfileController {

    private final UserProfileService userProfileService;
    private final SessionTokenService sessionTokenService;

    public UserProfileController(
            UserProfileService userProfileService,
            SessionTokenService sessionTokenService
    ) {
        this.userProfileService = userProfileService;
        this.sessionTokenService = sessionTokenService;
    }

    @GetMapping
    public List<UserProfileResponse> findAll(
            @PathVariable Long userId,
            @RequestHeader(
                    value = HttpHeaders.AUTHORIZATION,
                    required = false
            )
            String authorization
    ) {
        verifyOwner(userId, authorization);
        return userProfileService.findAll(userId);
    }

    @PostMapping
    public UserProfileResponse save(
            @PathVariable Long userId,
            @RequestHeader(
                    value = HttpHeaders.AUTHORIZATION,
                    required = false
            )
            String authorization,
            @Valid @RequestBody SaveProfileRequest request
    ) {
        verifyOwner(userId, authorization);

        return userProfileService.save(
                userId,
                request
        );
    }

    @DeleteMapping("/{profileId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @PathVariable Long userId,
            @PathVariable String profileId,
            @RequestHeader(
                    value = HttpHeaders.AUTHORIZATION,
                    required = false
            )
            String authorization
    ) {
        verifyOwner(userId, authorization);

        userProfileService.delete(
                userId,
                profileId
        );
    }

    private void verifyOwner(
            Long requestedUserId,
            String authorization
    ) {
        Long authenticatedUserId =
                sessionTokenService.authenticateBearer(
                        authorization
                );

        if (!Objects.equals(
                requestedUserId,
                authenticatedUserId
        )) {
            throw new ApiException(
                    HttpStatus.FORBIDDEN,
                    "PROFILE_ACCESS_DENIED",
                    "다른 사용자의 주문표에는 접근할 수 없습니다."
            );
        }
    }
}