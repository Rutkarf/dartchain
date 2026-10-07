package io.dartchain.backend.faucet.store;

import java.math.BigDecimal;

/**
 * Solde faucet en attente (pièces M4T3R ramassées) — hors chaîne jusqu'au claim.
 */
public interface FaucetPendingBalanceStore {

    BigDecimal get(String walletAddress);

    /** Ajoute un montant ; retourne le solde pending après crédit. */
    BigDecimal add(String walletAddress, BigDecimal amount);

    /**
     * Débite jusqu'à {@code amount} du pending.
     * @return montant réellement débité
     */
    BigDecimal debit(String walletAddress, BigDecimal amount);
}
