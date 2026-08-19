package io.dartchain.backend.m4t3r.settlement;

import io.dartchain.backend.m4t3r.config.M4t3rRewardConfig;
import io.dartchain.backend.m4t3r.model.M4t3rReward;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Settlement testnet simulé : met en file sans transaction réelle.
 * Nécessite {@code m4t3r.reward.settlement-mode=TESTNET} côté serveur uniquement.
 */
@Service
public class TestnetSettlementService implements RewardSettlementService {

    private final M4t3rRewardConfig config;

    @Value("${m4t3r.reward.testnet-enabled:false}")
    private boolean testnetEnabled;

    @Value("${dartchain.chain.chain-id:3377}")
    private String chainId;

    public TestnetSettlementService(M4t3rRewardConfig config) {
        this.config = config;
    }

    @Override
    public SettlementResult settle(M4t3rReward reward) {
        if (!"TESTNET".equalsIgnoreCase(config.getSettlementMode())) {
            return SettlementResult.failed("Settlement mode not TESTNET");
        }
        if (!testnetEnabled) {
            return SettlementResult.failed("TESTNET_REQUIRES_EXPLICIT_CONFIG");
        }
        if (reward.getWalletAddress() == null || reward.getWalletAddress().isBlank()) {
            return SettlementResult.failed("WALLET_NOT_LINKED");
        }
        reward.setChainId(chainId);
        return SettlementResult.queuedOnChain(chainId);
    }
}
