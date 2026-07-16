package io.dartchain.backend.dto;

import jakarta.validation.constraints.NotBlank;

public class FaucetClaimRequest {

    @NotBlank(message = "walletAddress is required")
    private String walletAddress;

    /** Montant R4V3 affiché dans le faucet (microcents m4t3r). */
    private String amount;

    private String clientId;

    public FaucetClaimRequest() {
    }

    public String getWalletAddress() {
        return walletAddress;
    }

    public void setWalletAddress(String walletAddress) {
        this.walletAddress = walletAddress;
    }

    public String getAmount() {
        return amount;
    }

    public void setAmount(String amount) {
        this.amount = amount;
    }

    public String getClientId() {
        return clientId;
    }

    public void setClientId(String clientId) {
        this.clientId = clientId;
    }
}