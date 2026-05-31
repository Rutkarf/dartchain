package io.dartchain.backend.dto;

import io.dartchain.backend.model.Wallet;

public record WalletCreateResponse(
        Wallet wallet,
        boolean testnetSeeded,
        String welcomeMessage
) {}
