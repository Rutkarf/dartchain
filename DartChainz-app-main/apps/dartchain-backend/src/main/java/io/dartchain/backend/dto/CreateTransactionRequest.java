package io.dartchain.backend.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public class CreateTransactionRequest {

    @NotBlank(message = "senderAddress is required")
    @Size(min = 4, max = 256, message = "senderAddress must contain between 4 and 256 characters")
    private String senderAddress;

    @NotBlank(message = "senderPublicKey is required")
    private String senderPublicKey;

    @NotBlank(message = "senderPrivateKey is required")
    private String senderPrivateKey;

    @NotBlank(message = "recipientAddress is required")
    @Size(min = 4, max = 256, message = "recipientAddress must contain between 4 and 256 characters")
    private String recipientAddress;

    @DecimalMin(value = "0.00000001", inclusive = true, message = "amount must be greater than 0")
    @Digits(integer = 18, fraction = 8, message = "amount format is invalid")
    private BigDecimal amount;

    public CreateTransactionRequest() {
    }

    public String getSenderAddress() {
        return senderAddress;
    }

    public void setSenderAddress(String senderAddress) {
        this.senderAddress = senderAddress;
    }

    public String getSenderPublicKey() {
        return senderPublicKey;
    }

    public void setSenderPublicKey(String senderPublicKey) {
        this.senderPublicKey = senderPublicKey;
    }

    public String getSenderPrivateKey() {
        return senderPrivateKey;
    }

    public void setSenderPrivateKey(String senderPrivateKey) {
        this.senderPrivateKey = senderPrivateKey;
    }

    public String getRecipientAddress() {
        return recipientAddress;
    }

    public void setRecipientAddress(String recipientAddress) {
        this.recipientAddress = recipientAddress;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }
}