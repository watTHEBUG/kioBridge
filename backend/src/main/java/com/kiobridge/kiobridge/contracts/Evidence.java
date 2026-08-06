package com.kiobridge.kiobridge.contracts;

import java.util.List;
import java.util.Map;

public record Evidence(
    String evidenceVersion,
    String runId,
    String sessionId,
    String environmentId,
    String fixtureVersion,
    String submissionHash,
    String createdAt,
    String validationMode,
    String executionEnvironment,
    boolean actualDeviceCommandSent,
    boolean participantSubmissionUsed,
    boolean officialRecommendationGenerated,
    Map<String, Object> profileSummary,
    Object recommendation,
    Object userDecision,
    List<Object> executionPlan,
    List<Object> executedActions,
    List<String> stateHistory,
    List<Object> safetyChecks,
    List<Object> validationErrors,
    int plannedPaymentActionCount,
    int executedPaymentActionCount,
    int blockedPaymentActionCount,
    String lastBusinessState,
    String terminalState,
    String stopType,
    String stopReason,
    boolean boundaryReached,
    boolean requiredVerifierExecuted,
    boolean submissionValid,
    String result,
    String driverId,
    String driverStatus,
    Map<String, Object> reviewSnapshot,
    Map<String, Object> sessionContextSummary,
    String resultScope,
    SimulationValidation simulationValidation
) {}