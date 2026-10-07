package io.dartchain.backend.blockchain.dto;

import java.math.BigDecimal;

public class TransactionResponse {

    private String id;
    private String hash;
    private String sender;
    private String recipient;
    private BigDecimal amount;
    private Long timestamp;
    private String signature;
    private Boolean systemReward;
    private String payload;
    private String status;

    public TransactionResponse() {
    }

    public TransactionResponse(
            String id,
            String hash,
            String sender,
            String recipient,
            BigDecimal amount,
            Long timestamp,
            String signature,
            Boolean systemReward,
            String payload,
            String status
    ) {
        this.id = id;
        this.hash = hash;
        this.sender = sender;
        this.recipient = recipient;
        this.amount = amount;
        this.timestamp = timestamp;
        this.signature = signature;
        this.systemReward = systemReward;
        this.payload = payload;
        this.status = status;
    }

    public String getId() {
        return id;
    }

    public String getHash() {
        return hash;
    }

    public String getSender() {
        return sender;
    }

    public String getRecipient() {
        return recipient;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public Long getTimestamp() {
        return timestamp;
    }

    public String getSignature() {
        return signature;
    }

    public Boolean getSystemReward() {
        return systemReward;
    }

    public String getPayload() {
        return payload;
    }

    public String getStatus() {
        return status;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setHash(String hash) {
        this.hash = hash;
    }

    public void setSender(String sender) {
        this.sender = sender;
    }

    public void setRecipient(String recipient) {
        this.recipient = recipient;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public void setTimestamp(Long timestamp) {
        this.timestamp = timestamp;
    }

    public void setSignature(String signature) {
        this.signature = signature;
    }

    public void setSystemReward(Boolean systemReward) {
        this.systemReward = systemReward;
    }

    public void setPayload(String payload) {
        this.payload = payload;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}