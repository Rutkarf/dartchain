package io.dartchain.backend.faucet.application;

import io.dartchain.backend.faucet.dto.FaucetClaimRequest;
import io.dartchain.backend.faucet.dto.FaucetClaimResponse;
import io.dartchain.backend.faucet.dto.FaucetConfigResponse;
import io.dartchain.backend.faucet.dto.FaucetStateResponse;
import io.dartchain.backend.faucet.model.FaucetClaim;

import java.util.List;

public interface FaucetService {

    FaucetStateResponse getState(String walletAddress);

    FaucetClaimResponse claim(FaucetClaimRequest request, String authorizationHeader);

    FaucetConfigResponse getConfig();

    List<FaucetClaim> getClaimsForWallet(String walletAddress);

    List<FaucetClaim> getClaimsForWallet(String walletAddress, int offset, int limit);
}