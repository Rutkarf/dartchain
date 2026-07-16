package io.dartchain.backend.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "faucet_claims")
public class FaucetClaimEntity {

    @Id
    @Column(name = "id", length = 36)
    private String id;

    @Column(name = "wallet_address", nullable = false, length = 128)
    private String walletAddress;

    @Column(name = "amount", nullable = false, precision = 38, scale = 26)
    private BigDecimal amount;

    @Column(name = "claimed_at", nullable = false)
    private long claimedAt;

    @Column(name = "next_eligible_at", nullable = false)
    private long nextEligibleAt;

    @Column(name = "tx_hash", length = 128)
    private String txHash;

    @Column(name = "client_id", length = 128)
    private String clientId;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

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

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
