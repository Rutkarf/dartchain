package io.dartchain.backend.m4t3r.settlement;

import io.dartchain.backend.faucet.store.FaucetPendingBalanceStore;
import io.dartchain.backend.m4t3r.config.M4t3rRewardConfig;
import io.dartchain.backend.m4t3r.model.M4t3rReward;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

/**
 * Accrue les pièces M4T3R sur le faucet pending — pas de mint / pas de bloc au ramassage.
 */
@Service
public class OffChainSettlementService implements RewardSettlementService {

    private final FaucetPendingBalanceStore pendingBalanceStore;
    private final M4t3rRewardConfig config;

    public OffChainSettlementService(FaucetPendingBalanceStore pendingBalanceStore, M4t3rRewardConfig config) {
        this.pendingBalanceStore = pendingBalanceStore;
        this.config = config;
    }

    @Override
    public synchronized SettlementResult settle(M4t3rReward reward) {
        if (!"OFFCHAIN".equalsIgnoreCase(config.getSettlementMode())) {
            return SettlementResult.failed("Settlement mode not OFFCHAIN: " + config.getSettlementMode());
        }
        if (reward.getWalletAddress() == null || reward.getWalletAddress().isBlank()) {
            return SettlementResult.failed("WALLET_NOT_LINKED");
        }
        if (reward.getAmount() == null || reward.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            return SettlementResult.failed("INVALID_AMOUNT");
        }

        BigDecimal pendingAfter = pendingBalanceStore.add(reward.getWalletAddress(), reward.getAmount());
        reward.setTransactionId(reward.getRewardId());
        reward.setChainId("faucet-pending");
        return SettlementResult.creditedFaucetPending(reward.getRewardId(), pendingAfter);
    }
}
