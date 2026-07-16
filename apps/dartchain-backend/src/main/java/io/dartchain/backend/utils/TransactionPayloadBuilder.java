package io.dartchain.backend.utils;

import java.math.BigDecimal;

/** Canon de payload pour signatures ECDSA des transactions on-chain (Phase M). */
public final class TransactionPayloadBuilder {

    private TransactionPayloadBuilder() {
    }

    public static String build(
            String senderAddress,
            String recipientAddress,
            BigDecimal amount,
            long timestamp,
            String memo
    ) {
        String normalizedMemo = memo != null ? memo.trim() : "";
        String payload = senderAddress
                + "|" + recipientAddress
                + "|" + formatAmount(amount)
                + "|" + timestamp;
        if (!normalizedMemo.isEmpty()) {
            payload += "|" + normalizedMemo;
        }
        return payload;
    }

    public static String formatAmount(BigDecimal amount) {
        if (amount == null) {
            return "0";
        }
        return amount.stripTrailingZeros().toPlainString();
    }
}
