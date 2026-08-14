package com.kiobridge.kiobridge.modules.member.controller;

import com.kiobridge.kiobridge.common.web.ApiException;
import com.kiobridge.kiobridge.modules.member.service.SessionTokenService;
import com.kiobridge.kiobridge.modules.member.service.UserAccountService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.Objects;

/** 로그인한 사용자의 계정 삭제 API. */
@RestController
@RequestMapping("/api/v1/users")
public class UserAccountController {

    private final UserAccountService userAccountService;
    private final SessionTokenService sessionTokenService;

    public UserAccountController(
            UserAccountService userAccountService,
            SessionTokenService sessionTokenService
    ) {
        this.userAccountService = userAccountService;
        this.sessionTokenService = sessionTokenService;
    }

    @DeleteMapping("/{userId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @PathVariable Long userId,
            @RequestHeader(
                    value = HttpHeaders.AUTHORIZATION,
                    required = false
            )
            String authorization
    ) {
        Long authenticatedUserId =
                sessionTokenService.authenticateBearer(authorization);

        if (!Objects.equals(userId, authenticatedUserId)) {
            throw new ApiException(
                    HttpStatus.FORBIDDEN,
                    "USER_ACCESS_DENIED",
                    "다른 사용자의 계정은 지울 수 없습니다."
            );
        }

        userAccountService.delete(userId);
    }
}
