package io.dartchain.backend.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public class CreatePendingTransactionRequest {

    @NotBlank(message = "fromAddress is required")
    @Size(min = 4, max = 256, message = "fromAddress must contain between 4 and 256 characters")
    private String fromAddress;

    @NotBlank(message = "toAddress is required")
    @Size(min = 4, max = 256, message = "toAddress must contain between 4 and 256 characters")
    private String toAddress;

    @DecimalMin(value = "0.00000001", inclusive = true, message = "amount must be greater than 0")
    @Digits(integer = 18, fraction = 8, message = "amount format is invalid")
    private BigDecimal amount;

    @Size(max = 500, message = "data must not exceed 500 characters")
    private String data;

    public CreatePendingTransactionRequest() {
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

    public String getData() {
        return data;
    }

    public void setData(String data) {
        this.data = data;
    }
}