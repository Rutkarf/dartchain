package io.dartchain.backend.faucet.application;

import io.dartchain.backend.dto.FaucetClaimRequest;
import io.dartchain.backend.dto.FaucetClaimResponse;
import io.dartchain.backend.dto.FaucetConfigResponse;
import io.dartchain.backend.dto.FaucetStateResponse;
import io.dartchain.backend.model.FaucetClaim;

import java.util.List;

public interface FaucetService {

    FaucetStateResponse getState(String walletAddress);

    FaucetClaimResponse claim(FaucetClaimRequest request, String authorizationHeader);

    FaucetConfigResponse getConfig();

    List<FaucetClaim> getClaimsForWallet(String walletAddress);

    List<FaucetClaim> getClaimsForWallet(String walletAddress, int offset, int limit);
}