package io.dartchain.backend.explorer.dto;

import java.math.BigDecimal;

public record ExplorerSearchResultDto(
        String kind,
        String label,
        String subtitle,
        Integer blockIndex,
        String blockHash,
        String transactionId,
        String address,
        BigDecimal balance
) {
}
