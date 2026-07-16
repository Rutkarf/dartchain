package io.dartchain.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

import java.math.BigDecimal;
import java.time.Duration;

@Configuration
public class FaucetConfig {

    /** 1 m4t3r = plus petite unité R4V3 (10^-26). */
    @Value("${faucet.amount:0.00000000000000000000000001}")
    private String amount;

    @Value("${faucet.cooldown-seconds:10}")
    private long cooldownSeconds;

    @Value("${faucet.wallet-prefix:R4V3}")
    private String walletPrefix;

    public BigDecimal getAmount() {
        return new BigDecimal(amount);
    }

    public long getCooldownSeconds() {
        return cooldownSeconds;
    }

    public Duration getCooldownDuration() {
        return Duration.ofSeconds(cooldownSeconds);
    }

    public String getWalletPrefix() {
        return walletPrefix;
    }
}