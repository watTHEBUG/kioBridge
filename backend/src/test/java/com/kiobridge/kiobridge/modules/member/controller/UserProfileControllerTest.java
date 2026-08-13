package com.kiobridge.kiobridge.modules.member.controller;

import com.kiobridge.kiobridge.common.web.ApiException;
import com.kiobridge.kiobridge.modules.member.controller.dto.UserProfileResponse;
import com.kiobridge.kiobridge.modules.member.exception.UserNotFoundException;
import com.kiobridge.kiobridge.modules.member.service.SessionTokenService;
import com.kiobridge.kiobridge.modules.member.service.UserProfileService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(UserProfileController.class)
class UserProfileControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UserProfileService userProfileService;

    @MockitoBean
    private SessionTokenService sessionTokenService;

    @BeforeEach
    void authenticateOwner() {
        when(
                sessionTokenService.authenticateBearer(
                        "Bearer owner-token"
                )
        ).thenReturn(1L);
    }

    @Test
    void 프로필을_저장한다() throws Exception {
        when(userProfileService.save(
                eq(1L),
                any()
        )).thenReturn(response());

        mockMvc.perform(
                        post(
                                "/api/v1/users/1/profiles"
                        )
                                .header(
                                        HttpHeaders.AUTHORIZATION,
                                        "Bearer owner-token"
                                )
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content("""
                                        {
                                          "profileId": "profile-001",
                                          "menuName": "닭강정",
                                          "place": "음식점",
                                          "selections": {
                                            "맵기": ["매운맛"],
                                            "형태": ["순살"]
                                          },
                                          "memo": ""
                                        }
                                        """)
                )
                .andExpect(status().isOk())
                .andExpect(
                        jsonPath("$.profileId")
                                .value("profile-001")
                );
    }

    @Test
    void 프로필_목록을_조회한다()
            throws Exception {

        when(userProfileService.findAll(1L))
                .thenReturn(
                        List.of(response())
                );

        mockMvc.perform(
                        get(
                                "/api/v1/users/1/profiles"
                        )
                                .header(
                                        HttpHeaders.AUTHORIZATION,
                                        "Bearer owner-token"
                                )
                )
                .andExpect(status().isOk())
                .andExpect(
                        jsonPath(
                                "$[0].profileId"
                        ).value("profile-001")
                )
                .andExpect(
                        jsonPath(
                                "$[0].selections['맵기'][0]"
                        ).value("매운맛")
                );
    }

    @Test
    void 필수값이_없으면_저장을_거절한다()
            throws Exception {

        mockMvc.perform(
                        post(
                                "/api/v1/users/1/profiles"
                        )
                                .header(
                                        HttpHeaders.AUTHORIZATION,
                                        "Bearer owner-token"
                                )
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content("""
                                        {
                                          "profileId": "",
                                          "menuName": "",
                                          "place": "음식점",
                                          "selections": {}
                                        }
                                        """)
                )
                .andExpect(
                        status().isBadRequest()
                );
    }

    @Test
    void 선택값_배열이_비어있으면_저장을_거절한다()
            throws Exception {

        mockMvc.perform(
                        post(
                                "/api/v1/users/1/profiles"
                        )
                                .header(
                                        HttpHeaders.AUTHORIZATION,
                                        "Bearer owner-token"
                                )
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content("""
                                        {
                                          "profileId": "profile-001",
                                          "menuName": "닭강정",
                                          "place": "음식점",
                                          "selections": {
                                            "맵기": []
                                          },
                                          "memo": ""
                                        }
                                        """)
                )
                .andExpect(status().isBadRequest())
                .andExpect(
                        jsonPath("$.code")
                                .value("INVALID_REQUEST")
                )
                .andExpect(
                        jsonPath("$.message")
                                .value(containsString("selections"))
                );
    }

    @Test
    void 사용자가_없으면_404를_반환한다()
            throws Exception {

        when(
                sessionTokenService.authenticateBearer(
                        "Bearer user-999-token"
                )
        ).thenReturn(999L);

        when(userProfileService.findAll(999L))
                .thenThrow(
                        new UserNotFoundException()
                );

        mockMvc.perform(
                        get(
                                "/api/v1/users/999/profiles"
                        )
                                .header(
                                        HttpHeaders.AUTHORIZATION,
                                        "Bearer user-999-token"
                                )
                )
                .andExpect(status().isNotFound())
                .andExpect(
                        jsonPath("$.code")
                                .value("USER_NOT_FOUND")
                );
    }

    @Test
    void 프로필을_삭제한다()
            throws Exception {

        mockMvc.perform(
                        delete(
                                "/api/v1/users/1/profiles/profile-001"
                        )
                                .header(
                                        HttpHeaders.AUTHORIZATION,
                                        "Bearer owner-token"
                                )
                )
                .andExpect(
                        status().isNoContent()
                );

        verify(userProfileService)
                .delete(
                        1L,
                        "profile-001"
                );
    }

    @Test
    void 인증_헤더가_없으면_401을_반환한다()
            throws Exception {

        when(
                sessionTokenService.authenticateBearer(null)
        ).thenThrow(
                new ApiException(
                        HttpStatus.UNAUTHORIZED,
                        "AUTHENTICATION_REQUIRED",
                        "로그인이 필요합니다."
                )
        );

        mockMvc.perform(
                        get(
                                "/api/v1/users/1/profiles"
                        )
                )
                .andExpect(status().isUnauthorized())
                .andExpect(
                        jsonPath("$.code")
                                .value("AUTHENTICATION_REQUIRED")
                );

        verifyNoInteractions(userProfileService);
    }

    @Test
    void 다른_사용자의_주문표는_삭제할_수_없다()
            throws Exception {

        when(
                sessionTokenService.authenticateBearer(
                        "Bearer other-token"
                )
        ).thenReturn(2L);

        mockMvc.perform(
                        delete(
                                "/api/v1/users/1/profiles/profile-001"
                        )
                                .header(
                                        HttpHeaders.AUTHORIZATION,
                                        "Bearer other-token"
                                )
                )
                .andExpect(status().isForbidden())
                .andExpect(
                        jsonPath("$.code")
                                .value("PROFILE_ACCESS_DENIED")
                );

        verifyNoInteractions(userProfileService);
    }

    private UserProfileResponse response() {
        return new UserProfileResponse(
                "profile-001",
                "닭강정",
                "음식점",
                Map.of(
                        "맵기",
                        List.of("매운맛"),

                        "형태",
                        List.of("순살")
                ),
                ""
        );
    }
}
