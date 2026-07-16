package io.dartchain.backend.dto;

import jakarta.validation.constraints.NotBlank;

public record MinePendingTransactionRequest(
        @NotBlank(message = "id is required")
        String id
) {}