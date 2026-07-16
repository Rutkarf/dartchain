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

    /**
     * @deprecated Phase M — préférer {@link #signature} + {@link #payload} + {@link #timestamp}
     * (signature côté client). Conservé pour compatibilité legacy.
     */
    @Deprecated
    private String senderPrivateKey;

    /** Signature ECDSA base64 du {@link #payload} (Phase M). */
    private String signature;

    /** Payload signé : {@code sender|recipient|amount|timestamp[|memo]}. */
    private String payload;

    /** Horodatage ms embarqué dans le payload signé (Phase M). */
    private Long timestamp;

    @NotBlank(message = "recipientAddress is required")
    @Size(min = 4, max = 256, message = "recipientAddress must contain between 4 and 256 characters")
    private String recipientAddress;

    @DecimalMin(value = "0.00000001", inclusive = true, message = "amount must be greater than 0")
    @Digits(integer = 18, fraction = 8, message = "amount format is invalid")
    private BigDecimal amount;

    @Size(max = 256, message = "memo must not exceed 256 characters")
    private String memo;

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

    public String getMemo() {
        return memo;
    }

    public void setMemo(String memo) {
        this.memo = memo;
    }

    public String getSignature() {
        return signature;
    }

    public void setSignature(String signature) {
        this.signature = signature;
    }

    public String getPayload() {
        return payload;
    }

    public void setPayload(String payload) {
        this.payload = payload;
    }

    public Long getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(Long timestamp) {
        this.timestamp = timestamp;
    }

    public boolean hasClientSignature() {
        return signature != null && !signature.isBlank()
                && payload != null && !payload.isBlank()
                && timestamp != null;
    }

    public boolean hasLegacyPrivateKey() {
        return senderPrivateKey != null && !senderPrivateKey.isBlank();
    }
}