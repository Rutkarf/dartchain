package io.dartchain.backend.m4t3r.settlement;

import io.dartchain.backend.m4t3r.config.M4t3rRewardConfig;
import io.dartchain.backend.m4t3r.model.M4t3rReward;
import io.dartchain.backend.model.Transaction;
import io.dartchain.backend.service.BlockchainService;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

@Service
public class OffChainSettlementService implements RewardSettlementService {

    private final BlockchainService blockchainService;
    private final M4t3rRewardConfig config;

    public OffChainSettlementService(BlockchainService blockchainService, M4t3rRewardConfig config) {
        this.blockchainService = blockchainService;
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
        Transaction tx = blockchainService.mintSystemCredit(
                reward.getWalletAddress(),
                reward.getAmount(),
                "M4T3R_TRAIL:" + reward.getRewardId()
        );
        String txHash = tx.getHash();
        reward.setTransactionId(txHash);
        reward.setChainId("offchain");
        BigDecimal balanceAfter = blockchainService.getBalance(reward.getWalletAddress());
        return SettlementResult.creditedOffChain(txHash, "offchain", balanceAfter);
    }
}
