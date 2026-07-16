package io.dartchain.backend.dto;

public class FaucetStateResponse {

    private String walletAddress;
    private boolean eligible;
    private long cooldownSeconds;
    private String nextEligibleAt;
    private String lastClaimAmount;
    private String lastClaimAt;
    private String defaultClaimAmount;
    private long configCooldownSeconds;

    public FaucetStateResponse() {
    }

    public String getWalletAddress() {
        return walletAddress;
    }

    public void setWalletAddress(String walletAddress) {
        this.walletAddress = walletAddress;
    }

    public boolean isEligible() {
        return eligible;
    }

    public void setEligible(boolean eligible) {
        this.eligible = eligible;
    }

    public long getCooldownSeconds() {
        return cooldownSeconds;
    }

    public void setCooldownSeconds(long cooldownSeconds) {
        this.cooldownSeconds = cooldownSeconds;
    }

    public String getNextEligibleAt() {
        return nextEligibleAt;
    }

    public void setNextEligibleAt(String nextEligibleAt) {
        this.nextEligibleAt = nextEligibleAt;
    }

    public String getLastClaimAmount() {
        return lastClaimAmount;
    }

    public void setLastClaimAmount(String lastClaimAmount) {
        this.lastClaimAmount = lastClaimAmount;
    }

    public String getLastClaimAt() {
        return lastClaimAt;
    }

    public void setLastClaimAt(String lastClaimAt) {
        this.lastClaimAt = lastClaimAt;
    }

    public String getDefaultClaimAmount() {
        return defaultClaimAmount;
    }

    public void setDefaultClaimAmount(String defaultClaimAmount) {
        this.defaultClaimAmount = defaultClaimAmount;
    }

    public long getConfigCooldownSeconds() {
        return configCooldownSeconds;
    }

    public void setConfigCooldownSeconds(long configCooldownSeconds) {
        this.configCooldownSeconds = configCooldownSeconds;
    }
}