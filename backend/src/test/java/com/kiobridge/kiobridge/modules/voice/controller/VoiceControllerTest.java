package com.kiobridge.kiobridge.modules.voice.controller;

import com.kiobridge.kiobridge.common.web.ApiException;
import com.kiobridge.kiobridge.modules.voice.service.VoiceCorrectionLogService;
import com.kiobridge.kiobridge.modules.voice.service.VoiceTranscriptionService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(VoiceController.class)
class VoiceControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private VoiceTranscriptionService voiceTranscriptionService;

    /*
     * VoiceController 생성자에 정정 로그 서비스가 추가되면서 이 슬라이스도
     * 이 빈을 요구하게 됐다(@WebMvcTest 는 컨트롤러가 필요로 하는 빈만 채워
     * 준다). 안 붙이면 컨텍스트 자체가 못 뜬다
     * (NoSuchBeanDefinitionException → UnsatisfiedDependencyException).
     */
    @MockitoBean
    private VoiceCorrectionLogService voiceCorrectionLogService;

    @Test
    void 오디오를_보내면_인식된_글을_돌려준다() throws Exception {
        MockMultipartFile audio =
                new MockMultipartFile("audio", "clip.webm", "audio/webm", new byte[]{1, 2, 3});

        when(voiceTranscriptionService.transcribe(any(), eq("ko-KR")))
                .thenReturn("네");

        mockMvc.perform(
                        multipart("/api/v1/voice/transcribe")
                                .file(audio)
                                .param("language", "ko-KR")
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.text").value("네"));
    }

    @Test
    void 언어_없이도_보낼_수_있다() throws Exception {
        MockMultipartFile audio =
                new MockMultipartFile("audio", "clip.webm", "audio/webm", new byte[]{1, 2, 3});

        when(voiceTranscriptionService.transcribe(any(), isNull()))
                .thenReturn("yes");

        mockMvc.perform(multipart("/api/v1/voice/transcribe").file(audio))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.text").value("yes"));
    }

    @Test
    void 서비스가_ApiException을_던지면_그_상태코드_그대로_응답한다() throws Exception {
        MockMultipartFile audio =
                new MockMultipartFile("audio", "clip.webm", "audio/webm", new byte[]{1, 2, 3});

        when(voiceTranscriptionService.transcribe(any(), any()))
                .thenThrow(new ApiException(
                        HttpStatus.SERVICE_UNAVAILABLE, "STT_NOT_CONFIGURED", "음성 인식이 설정되어 있지 않아요."
                ));

        mockMvc.perform(
                        multipart("/api/v1/voice/transcribe")
                                .file(audio)
                                .param("language", "ko-KR")
                )
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("STT_NOT_CONFIGURED"));
    }

    @Test
    void 정정기록을_받으면_서비스로_넘기고_202를_돌려준다() throws Exception {
        mockMvc.perform(
                        post("/api/v1/voice/correction-log")
                                .contentType(APPLICATION_JSON)
                                .content("""
                                        { "questionType": "YES_NO", "recognizedText": "안녕", "correctedTo": "NO" }
                                        """)
                )
                .andExpect(status().isAccepted());

        verify(voiceCorrectionLogService).log("YES_NO", "안녕", "NO");
    }

    @Test
    void 정정기록의_correctedTo가_YES_NO가_아니면_400이다() throws Exception {
        // @Pattern(regexp = "YES|NO") 검증 — 이 표는 사람이 나중에 읽는 자료라 값이 좁아야 한다.
        mockMvc.perform(
                        post("/api/v1/voice/correction-log")
                                .contentType(APPLICATION_JSON)
                                .content("""
                                        { "questionType": "YES_NO", "recognizedText": "안녕", "correctedTo": "MAYBE" }
                                        """)
                )
                .andExpect(status().isBadRequest());
    }
}
