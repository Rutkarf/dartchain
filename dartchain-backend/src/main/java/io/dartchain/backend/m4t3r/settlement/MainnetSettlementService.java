package io.dartchain.backend.m4t3r.settlement;

import io.dartchain.backend.m4t3r.config.M4t3rRewardConfig;
import io.dartchain.backend.m4t3r.model.M4t3rReward;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Settlement mainnet : jamais activé par défaut.
 * Nécessite {@code m4t3r.reward.settlement-mode=MAINNET} ET {@code m4t3r.reward.mainnet-enabled=true}.
 */
@Service
public class MainnetSettlementService implements RewardSettlementService {

    private final M4t3rRewardConfig config;

    @Value("${m4t3r.reward.mainnet-enabled:false}")
    private boolean mainnetEnabled;

    public MainnetSettlementService(M4t3rRewardConfig config) {
        this.config = config;
    }

    @Override
    public SettlementResult settle(M4t3rReward reward) {
        if (!"MAINNET".equalsIgnoreCase(config.getSettlementMode())) {
            return SettlementResult.failed("Settlement mode not MAINNET");
        }
        if (!mainnetEnabled) {
            return SettlementResult.failed("MAINNET_REQUIRES_EXPLICIT_CONFIG");
        }
        return SettlementResult.failed("MAINNET_NOT_IMPLEMENTED");
    }
}
