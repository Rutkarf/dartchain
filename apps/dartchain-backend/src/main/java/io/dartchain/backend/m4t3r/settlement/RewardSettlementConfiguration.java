package io.dartchain.backend.m4t3r.settlement;

import io.dartchain.backend.m4t3r.config.M4t3rRewardConfig;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

@Configuration
public class RewardSettlementConfiguration {

    @Bean
    @Primary
    public RewardSettlementService rewardSettlementService(
            M4t3rRewardConfig config,
            OffChainSettlementService offChain,
            TestnetSettlementService testnet,
            MainnetSettlementService mainnet
    ) {
        String mode = config.getSettlementMode().toUpperCase();
        return switch (mode) {
            case "TESTNET" -> testnet;
            case "MAINNET" -> mainnet;
            default -> offChain;
        };
    }
}
