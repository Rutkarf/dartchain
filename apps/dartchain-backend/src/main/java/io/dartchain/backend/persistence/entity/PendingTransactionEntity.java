package io.dartchain.backend.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;

@Entity
@Table(name = "pending_transactions")
public class PendingTransactionEntity {

    @Id
    @Column(length = 36)
    private String id;

    @Column(name = "tx_hash", length = 128)
    private String txHash;

    @Column(name = "from_address", nullable = false, length = 128)
    private String fromAddress;

    @Column(name = "to_address", nullable = false, length = 128)
    private String toAddress;

    @Column(nullable = false, precision = 38, scale = 26)
    private BigDecimal amount;

    @Column(name = "tx_data")
    private String txData;

    @Column
    private String signature;

    @Column(length = 32)
    private String status;

    @Column(name = "system_reward", nullable = false)
    private boolean systemReward;

    @Column(name = "created_at", nullable = false)
    private long createdAt;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getTxHash() {
        return txHash;
    }

    public void setTxHash(String txHash) {
        this.txHash = txHash;
    }

    public String getFromAddress() {
        return fromAddress;
    }

    public void setFromAddress(String fromAddress) {
        this.fromAddress = fromAddress;
    }

    public String getToAddress() {
        return toAddress;
    }

    public void setToAddress(String toAddress) {
        this.toAddress = toAddress;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public String getTxData() {
        return txData;
    }

    public void setTxData(String txData) {
        this.txData = txData;
    }

    public String getSignature() {
        return signature;
    }

    public void setSignature(String signature) {
        this.signature = signature;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public boolean isSystemReward() {
        return systemReward;
    }

    public void setSystemReward(boolean systemReward) {
        this.systemReward = systemReward;
    }

    public long getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(long createdAt) {
        this.createdAt = createdAt;
    }
}
