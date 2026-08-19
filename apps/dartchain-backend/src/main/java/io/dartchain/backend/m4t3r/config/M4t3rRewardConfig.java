package io.dartchain.backend.m4t3r.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

import java.math.BigDecimal;

@Configuration
public class M4t3rRewardConfig {

    @Value("${m4t3r.reward.settlement-mode:OFFCHAIN}")
    private String settlementMode;

    /** 1 jeton collecté = 1 m4t3r (plus petite unité R4V3). */
    @Value("${m4t3r.reward.amount-per-token:0.00000000000000000000000001}")
    private String amountPerToken;

    @Value("${m4t3r.reward.signing-key-id:dev-reward-key-1}")
    private String signingKeyId;

    @Value("${m4t3r.reward.signing-key:change-me-m4t3r-reward-dev-only}")
    private String signingKey;

    @Value("${m4t3r.reward.max-speed-mps:5.0}")
    private String maxSpeedMps;

    @Value("${m4t3r.reward.world-id:marseille}")
    private String worldId;

    @Value("${m4t3r.rewards.path:data/m4t3r-rewards.json}")
    private String rewardsStorePath;

    public String getSettlementMode() {
        return settlementMode;
    }

    public BigDecimal getAmountPerToken() {
        return new BigDecimal(amountPerToken);
    }

    public String getSigningKeyId() {
        return signingKeyId;
    }

    public String getSigningKey() {
        return signingKey;
    }

    public BigDecimal getMaxSpeedMps() {
        return new BigDecimal(maxSpeedMps);
    }

    public String getWorldId() {
        return worldId;
    }

    public String getRewardsStorePath() {
        return rewardsStorePath;
    }
}
