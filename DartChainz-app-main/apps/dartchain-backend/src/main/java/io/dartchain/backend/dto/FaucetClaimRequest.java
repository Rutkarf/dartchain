package io.dartchain.backend.dto;

import jakarta.validation.constraints.NotBlank;

public class FaucetClaimRequest {

    @NotBlank(message = "walletAddress is required")
    private String walletAddress;

    private String clientId;

    public FaucetClaimRequest() {
    }

    public String getWalletAddress() {
        return walletAddress;
    }

    public void setWalletAddress(String walletAddress) {
        this.walletAddress = walletAddress;
    }

    public String getClientId() {
        return clientId;
    }

    public void setClientId(String clientId) {
        this.clientId = clientId;
    }
}