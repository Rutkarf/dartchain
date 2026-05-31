package io.dartchain.backend.dto;

import java.math.BigDecimal;

public class SendTransactionRequest {
    private String fromAddress;
    private String toAddress;
    private BigDecimal amount;
}