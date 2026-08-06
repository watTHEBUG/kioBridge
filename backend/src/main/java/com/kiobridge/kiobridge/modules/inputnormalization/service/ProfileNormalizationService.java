package com.kiobridge.kiobridge.modules.inputnormalization.service;

import com.kiobridge.kiobridge.contracts.client.SimulationApiClient;
import com.kiobridge.kiobridge.contracts.client.dto.ContractValidationResult;
import com.kiobridge.kiobridge.contracts.input.profile.CanonicalProfile;
import com.kiobridge.kiobridge.modules.inputnormalization.dto.NormalizationStatus;
import com.kiobridge.kiobridge.modules.inputnormalization.dto.profile.ProfileNormalizationRequest;
import com.kiobridge.kiobridge.modules.inputnormalization.dto.profile.ProfileNormalizationResponse;
import com.kiobridge.kiobridge.modules.inputnormalization.mapper.ProfileMapper;
import org.springframework.stereotype.Service;

@Service
public class ProfileNormalizationService {

    private final ProfileMapper profileMapper;
    private final SimulationApiClient simulationApiClient;

    public ProfileNormalizationService(
            ProfileMapper profileMapper,
            SimulationApiClient simulationApiClient
    ) {
        this.profileMapper = profileMapper;
        this.simulationApiClient = simulationApiClient;
    }

    public ProfileNormalizationResponse normalize(
            ProfileNormalizationRequest request
    ) {
        CanonicalProfile profile =
                profileMapper.toCanonicalProfile(
                        request.teamId(),
                        request.profileInput()
                );

        ContractValidationResult validation =
                simulationApiClient.validateProfile(profile);

        NormalizationStatus status = validation.valid()
                ? NormalizationStatus.VALID
                : NormalizationStatus.INVALID;

        return new ProfileNormalizationResponse(
                status,
                profile,
                validation
        );
    }
}