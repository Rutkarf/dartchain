package io.dartchain.backend.faucet.dto;

public class FaucetClaimResponse {

    private boolean success;
    private String message;
    private String walletAddress;
    private String amount;
    private String claimedAt;
    private String nextEligibleAt;
    private long cooldownSeconds;
    private String txHash;

    public FaucetClaimResponse() {
    }

    public boolean isSuccess() {
        return success;
    }

    public void setSuccess(boolean success) {
        this.success = success;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
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

    public String getClaimedAt() {
        return claimedAt;
    }

    public void setClaimedAt(String claimedAt) {
        this.claimedAt = claimedAt;
    }

    public String getNextEligibleAt() {
        return nextEligibleAt;
    }

    public void setNextEligibleAt(String nextEligibleAt) {
        this.nextEligibleAt = nextEligibleAt;
    }

    public long getCooldownSeconds() {
        return cooldownSeconds;
    }

    public void setCooldownSeconds(long cooldownSeconds) {
        this.cooldownSeconds = cooldownSeconds;
    }

    public String getTxHash() {
        return txHash;
    }

    public void setTxHash(String txHash) {
        this.txHash = txHash;
    }
}