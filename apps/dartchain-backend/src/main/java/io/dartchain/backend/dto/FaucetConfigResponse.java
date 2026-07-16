package io.dartchain.backend.dto;

public class FaucetConfigResponse {

    private String defaultClaimAmount;
    private long cooldownSeconds;
    private String walletPrefix;
    private String nativeToken;
    private String smallestUnit;
    /** Plafond claim (R4V3) — aligné sur {@link io.dartchain.backend.service.FaucetServiceImpl#resolveClaimAmount}. */
    private String maxClaimAmount;

    public FaucetConfigResponse() {
    }

    public String getDefaultClaimAmount() {
        return defaultClaimAmount;
    }

    public void setDefaultClaimAmount(String defaultClaimAmount) {
        this.defaultClaimAmount = defaultClaimAmount;
    }

    public long getCooldownSeconds() {
        return cooldownSeconds;
    }

    public void setCooldownSeconds(long cooldownSeconds) {
        this.cooldownSeconds = cooldownSeconds;
    }

    public String getWalletPrefix() {
        return walletPrefix;
    }

    public void setWalletPrefix(String walletPrefix) {
        this.walletPrefix = walletPrefix;
    }

    public String getNativeToken() {
        return nativeToken;
    }

    public void setNativeToken(String nativeToken) {
        this.nativeToken = nativeToken;
    }

    public String getSmallestUnit() {
        return smallestUnit;
    }

    public void setSmallestUnit(String smallestUnit) {
        this.smallestUnit = smallestUnit;
    }

    public String getMaxClaimAmount() {
        return maxClaimAmount;
    }

    public void setMaxClaimAmount(String maxClaimAmount) {
        this.maxClaimAmount = maxClaimAmount;
    }
}
