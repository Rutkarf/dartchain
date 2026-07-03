package io.dartchain.backend.service;

import io.dartchain.backend.dto.FaucetClaimRequest;
import io.dartchain.backend.dto.FaucetClaimResponse;
import io.dartchain.backend.dto.FaucetStateResponse;
import io.dartchain.backend.model.FaucetClaim;

import java.util.List;

public interface FaucetService {

    FaucetStateResponse getState(String walletAddress);

    FaucetClaimResponse claim(FaucetClaimRequest request, String authorizationHeader);

    List<FaucetClaim> getAllClaims();
}