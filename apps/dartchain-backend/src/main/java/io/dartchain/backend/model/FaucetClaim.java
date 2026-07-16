package io.dartchain.backend.model;

import java.math.BigDecimal;

public class FaucetClaim {

    private String id;
    private String walletAddress;
    private BigDecimal amount;
    private long claimedAt;
    private long nextEligibleAt;
    private String txHash;
    private String clientId;

    public FaucetClaim() {
    }

    public FaucetClaim(String id, String walletAddress, BigDecimal amount, long claimedAt, long nextEligibleAt, String txHash, String clientId) {
        this.id = id;
        this.walletAddress = walletAddress;
        this.amount = amount;
        this.claimedAt = claimedAt;
        this.nextEligibleAt = nextEligibleAt;
        this.txHash = txHash;
        this.clientId = clientId;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getWalletAddress() {
        return walletAddress;
    }

    public void setWalletAddress(String walletAddress) {
        this.walletAddress = walletAddress;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public long getClaimedAt() {
        return claimedAt;
    }

    public void setClaimedAt(long claimedAt) {
        this.claimedAt = claimedAt;
    }

    public long getNextEligibleAt() {
        return nextEligibleAt;
    }

    public void setNextEligibleAt(long nextEligibleAt) {
        this.nextEligibleAt = nextEligibleAt;
    }

    public String getTxHash() {
        return txHash;
    }

    public void setTxHash(String txHash) {
        this.txHash = txHash;
    }

    public String getClientId() {
        return clientId;
    }

    public void setClientId(String clientId) {
        this.clientId = clientId;
    }
}