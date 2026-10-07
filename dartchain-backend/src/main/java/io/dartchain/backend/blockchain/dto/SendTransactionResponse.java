package io.dartchain.backend.blockchain.dto;

import java.math.BigDecimal;

public class SendTransactionResponse {
    private String transactionId;
    private String fromAddress;
    private String toAddress;
    private BigDecimal amount;
    private String status; // PENDING
    private String signature;
}