package com.kiobridge.kiobridge.modules.voice.controller;

import com.kiobridge.kiobridge.modules.voice.service.VoiceTranscriptionService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(VoiceTranscriptionController.class)
class VoiceTranscriptionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private VoiceTranscriptionService service;

    @Test
    void 짧은_녹음을_글로_바꾼다() throws Exception {
        when(service.transcribe(any())).thenReturn("매운맛");

        mockMvc.perform(post("/api/v1/voice/transcriptions")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "audioBase64": "AQID",
                      "mimeType": "audio/webm;codecs=opus",
                      "language": "ko-KR"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.text").value("매운맛"));
    }

    @Test
    void 허용하지_않은_언어는_거절한다() throws Exception {
        mockMvc.perform(post("/api/v1/voice/transcriptions")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "audioBase64": "AQID",
                      "mimeType": "audio/webm",
                      "language": "ja-JP"
                    }
                    """))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
    }

    @Test
    void 오디오가_비어있으면_거절한다() throws Exception {
        mockMvc.perform(post("/api/v1/voice/transcriptions")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "audioBase64": "",
                      "mimeType": "audio/webm",
                      "language": "ko-KR"
                    }
                    """))
            .andExpect(status().isBadRequest());
    }
}
