package io.dartchain.backend.faucet.dto;

public class FaucetStateResponse {

    private String walletAddress;
    private boolean eligible;
    private long cooldownSeconds;
    private String nextEligibleAt;
    private String lastClaimAmount;
    private String lastClaimAt;
    private String defaultClaimAmount;
    private long configCooldownSeconds;
    /** Solde faucet pending (pièces ramassées, pas encore claimées). */
    private String pendingAmount;
    /** Même pending, en nombre entier de m4t3r. */
    private String pendingM4t3r;
    /** Dernier claim, en nombre entier de m4t3r. */
    private String lastClaimM4t3r;

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

    public String getPendingAmount() {
        return pendingAmount;
    }

    public void setPendingAmount(String pendingAmount) {
        this.pendingAmount = pendingAmount;
    }

    public String getPendingM4t3r() {
        return pendingM4t3r;
    }

    public void setPendingM4t3r(String pendingM4t3r) {
        this.pendingM4t3r = pendingM4t3r;
    }

    public String getLastClaimM4t3r() {
        return lastClaimM4t3r;
    }

    public void setLastClaimM4t3r(String lastClaimM4t3r) {
        this.lastClaimM4t3r = lastClaimM4t3r;
    }
}