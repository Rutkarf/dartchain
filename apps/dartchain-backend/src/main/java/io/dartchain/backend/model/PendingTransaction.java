package io.dartchain.backend.model;

import java.math.BigDecimal;

public class PendingTransaction {

    private String id;
    private String hash;
    private String data;
    private Long createdAt;

    private String fromAddress;
    private String toAddress;
    private BigDecimal amount;
    private String signature;
    private String status;
    private Boolean systemReward;

    public PendingTransaction() {
    }

    public PendingTransaction(
            String id,
            String hash,
            String data,
            Long createdAt,
            String fromAddress,
            String toAddress,
            BigDecimal amount,
            String signature,
            String status,
            Boolean systemReward
    ) {
        this.id = id;
        this.hash = hash;
        this.data = data;
        this.createdAt = createdAt;
        this.fromAddress = fromAddress;
        this.toAddress = toAddress;
        this.amount = amount;
        this.signature = signature;
        this.status = status;
        this.systemReward = systemReward;
    }

    public String getId() {
        return id;
    }

    public String getHash() {
        return hash;
    }

    public String getData() {
        return data;
    }

    public Long getCreatedAt() {
        return createdAt;
    }

    public String getFromAddress() {
        return fromAddress;
    }

    public String getToAddress() {
        return toAddress;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public String getSignature() {
        return signature;
    }

    public String getStatus() {
        return status;
    }

    public Boolean getSystemReward() {
        return systemReward;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setHash(String hash) {
        this.hash = hash;
    }

    public void setData(String data) {
        this.data = data;
    }

    public void setCreatedAt(Long createdAt) {
        this.createdAt = createdAt;
    }

    public void setFromAddress(String fromAddress) {
        this.fromAddress = fromAddress;
    }

    public void setToAddress(String toAddress) {
        this.toAddress = toAddress;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public void setSignature(String signature) {
        this.signature = signature;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public void setSystemReward(Boolean systemReward) {
        this.systemReward = systemReward;
    }
}