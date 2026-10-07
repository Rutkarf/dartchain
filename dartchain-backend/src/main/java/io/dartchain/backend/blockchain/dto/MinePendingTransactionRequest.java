package io.dartchain.backend.blockchain.dto;

import jakarta.validation.constraints.NotBlank;

public record MinePendingTransactionRequest(
        @NotBlank(message = "id is required")
        String id
) {}