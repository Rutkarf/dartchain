package io.dartchain.backend.wallet.store;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface WalletBalanceStore {

    record Snapshot(
            String walletAddress,
            String token,
            BigDecimal balance,
            BigDecimal chainBalance,
            BigDecimal ledgerAdjustment,
            String source
    ) {
    }

    Optional<Snapshot> find(String walletAddress, String token);

    List<Snapshot> listByWallet(String walletAddress);

    /**
     * Upsert du snapshot et, si le solde a changé, enregistre un événement d'audit.
     */
    void upsertAndAudit(
            String walletAddress,
            String token,
            BigDecimal balance,
            BigDecimal chainBalance,
            BigDecimal ledgerAdjustment,
            String eventType,
            String reference
    );
}
