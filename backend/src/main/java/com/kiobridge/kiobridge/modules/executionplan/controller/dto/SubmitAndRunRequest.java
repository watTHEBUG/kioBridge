package com.kiobridge.kiobridge.modules.executionplan.controller.dto;

import com.kiobridge.kiobridge.contracts.ParticipantSubmission;

/** POST /internal/simulation/submit-and-run 요청. */
public record SubmitAndRunRequest(String sessionId, ParticipantSubmission submission) {}
