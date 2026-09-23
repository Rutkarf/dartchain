package io.dartchain.backend.metaverse.arena.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Config économique arène — DEV. Ne pas exposer comme API publique manipulable.
 */
@Component
@ConfigurationProperties(prefix = "dartchain.metaverse.arena")
public class ArenaBalanceProperties {

    private double lootRate = 0.10;
    private double lootCapPerElimination = 25;
    private double minimumFaucetBalanceToLoot = 1;
    private int spawnShieldDurationSeconds = 8;
    private int respawnDelaySeconds = 8;
    private int killCooldownSeconds = 5;
    private double dailyLootCap = 200;
    private double dailyLossCap = 200;
    private int newPlayerProtectionDurationSeconds = 60;
    private int antiFarmingThreshold = 8;
    private boolean enabled = true;

    public double getLootRate() {
        return lootRate;
    }

    public void setLootRate(double lootRate) {
        this.lootRate = lootRate;
    }

    public double getLootCapPerElimination() {
        return lootCapPerElimination;
    }

    public void setLootCapPerElimination(double lootCapPerElimination) {
        this.lootCapPerElimination = lootCapPerElimination;
    }

    public double getMinimumFaucetBalanceToLoot() {
        return minimumFaucetBalanceToLoot;
    }

    public void setMinimumFaucetBalanceToLoot(double minimumFaucetBalanceToLoot) {
        this.minimumFaucetBalanceToLoot = minimumFaucetBalanceToLoot;
    }

    public int getSpawnShieldDurationSeconds() {
        return spawnShieldDurationSeconds;
    }

    public void setSpawnShieldDurationSeconds(int spawnShieldDurationSeconds) {
        this.spawnShieldDurationSeconds = spawnShieldDurationSeconds;
    }

    public int getRespawnDelaySeconds() {
        return respawnDelaySeconds;
    }

    public void setRespawnDelaySeconds(int respawnDelaySeconds) {
        this.respawnDelaySeconds = respawnDelaySeconds;
    }

    public int getKillCooldownSeconds() {
        return killCooldownSeconds;
    }

    public void setKillCooldownSeconds(int killCooldownSeconds) {
        this.killCooldownSeconds = killCooldownSeconds;
    }

    public double getDailyLootCap() {
        return dailyLootCap;
    }

    public void setDailyLootCap(double dailyLootCap) {
        this.dailyLootCap = dailyLootCap;
    }

    public double getDailyLossCap() {
        return dailyLossCap;
    }

    public void setDailyLossCap(double dailyLossCap) {
        this.dailyLossCap = dailyLossCap;
    }

    public int getNewPlayerProtectionDurationSeconds() {
        return newPlayerProtectionDurationSeconds;
    }

    public void setNewPlayerProtectionDurationSeconds(int newPlayerProtectionDurationSeconds) {
        this.newPlayerProtectionDurationSeconds = newPlayerProtectionDurationSeconds;
    }

    public int getAntiFarmingThreshold() {
        return antiFarmingThreshold;
    }

    public void setAntiFarmingThreshold(int antiFarmingThreshold) {
        this.antiFarmingThreshold = antiFarmingThreshold;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }
}
