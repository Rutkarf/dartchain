package io.dartchain.backend.dto;

import java.math.BigDecimal;

/** Vue publique d'un wallet — sans clé privée (Phase M). */
public record WalletPublicView(
        String address,
        String publicKey,
        BigDecimal balance,
        String signingModel
) {
}
