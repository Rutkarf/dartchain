package io.dartchain.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

import java.math.BigDecimal;
import java.time.Duration;

@Configuration
public class FaucetConfig {

    @Value("${faucet.amount:100.00000000000000000000000000}")
    private String amount;

    @Value("${faucet.cooldown-seconds:10}")
    private long cooldownSeconds;

    @Value("${faucet.wallet-prefix:DART}")
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