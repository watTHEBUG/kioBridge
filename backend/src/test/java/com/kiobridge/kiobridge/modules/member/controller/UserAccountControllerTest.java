package com.kiobridge.kiobridge.modules.member.controller;

import com.kiobridge.kiobridge.common.web.ApiException;
import com.kiobridge.kiobridge.modules.member.service.SessionTokenService;
import com.kiobridge.kiobridge.modules.member.service.UserAccountService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(UserAccountController.class)
class UserAccountControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UserAccountService userAccountService;

    @MockitoBean
    private SessionTokenService sessionTokenService;

    @BeforeEach
    void authenticateOwner() {
        when(sessionTokenService.authenticateBearer("Bearer owner-token"))
                .thenReturn(1L);
    }

    @Test
    void 본인_계정을_삭제하면_204를_반환한다() throws Exception {
        mockMvc.perform(
                        delete("/api/v1/users/1")
                                .header(
                                        HttpHeaders.AUTHORIZATION,
                                        "Bearer owner-token"
                                )
                )
                .andExpect(status().isNoContent());

        verify(userAccountService).delete(1L);
    }

    @Test
    void 인증_헤더가_없으면_401을_반환하고_삭제하지_않는다() throws Exception {
        when(sessionTokenService.authenticateBearer(null))
                .thenThrow(
                        new ApiException(
                                HttpStatus.UNAUTHORIZED,
                                "AUTHENTICATION_REQUIRED",
                                "로그인이 필요합니다."
                        )
                );

        mockMvc.perform(delete("/api/v1/users/1"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("AUTHENTICATION_REQUIRED"));

        verifyNoInteractions(userAccountService);
    }

    @Test
    void 다른_사용자의_계정은_삭제할_수_없다() throws Exception {
        when(sessionTokenService.authenticateBearer("Bearer other-token"))
                .thenReturn(2L);

        mockMvc.perform(
                        delete("/api/v1/users/1")
                                .header(
                                        HttpHeaders.AUTHORIZATION,
                                        "Bearer other-token"
                                )
                )
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("USER_ACCESS_DENIED"));

        verifyNoInteractions(userAccountService);
    }
}
