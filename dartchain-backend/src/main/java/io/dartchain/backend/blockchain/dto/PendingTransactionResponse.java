package io.dartchain.backend.blockchain.dto;

import java.math.BigDecimal;

public class PendingTransactionResponse {

    private String id;
    private String hash;
    private String fromAddress;
    private String toAddress;
    private BigDecimal amount;
    private String data;
    private String signature;
    private String status;
    private Long createdAt;
    private Boolean systemReward;

    public PendingTransactionResponse() {
    }

    public PendingTransactionResponse(
            String id,
            String hash,
            String fromAddress,
            String toAddress,
            BigDecimal amount,
            String data,
            String signature,
            String status,
            Long createdAt,
            Boolean systemReward
    ) {
        this.id = id;
        this.hash = hash;
        this.fromAddress = fromAddress;
        this.toAddress = toAddress;
        this.amount = amount;
        this.data = data;
        this.signature = signature;
        this.status = status;
        this.createdAt = createdAt;
        this.systemReward = systemReward;
    }

    public String getId() {
        return id;
    }

    public String getHash() {
        return hash;
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

    public String getData() {
        return data;
    }

    public String getSignature() {
        return signature;
    }

    public String getStatus() {
        return status;
    }

    public Long getCreatedAt() {
        return createdAt;
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

    public void setFromAddress(String fromAddress) {
        this.fromAddress = fromAddress;
    }

    public void setToAddress(String toAddress) {
        this.toAddress = toAddress;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public void setData(String data) {
        this.data = data;
    }

    public void setSignature(String signature) {
        this.signature = signature;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public void setCreatedAt(Long createdAt) {
        this.createdAt = createdAt;
    }

    public void setSystemReward(Boolean systemReward) {
        this.systemReward = systemReward;
    }
}