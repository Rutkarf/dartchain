package io.dartchain.backend.metaverse.arena.model;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * État joueur arène — isolé du wallet / claim blockchain.
 */
public class ArenaPlayerState {

    private String userId;
    private String displayName;
    private String status = "alive";
    private BigDecimal faucetBalance = BigDecimal.ZERO;
    private BigDecimal protectedBalance = BigDecimal.ZERO;
    private BigDecimal pendingDisplayMirror = BigDecimal.ZERO;
    private int kills;
    private int deaths;
    private Instant spawnShieldUntil;
    private Instant createdAt = Instant.now();
    private Instant updatedAt = Instant.now();

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public BigDecimal getFaucetBalance() {
        return faucetBalance;
    }

    public void setFaucetBalance(BigDecimal faucetBalance) {
        this.faucetBalance = faucetBalance;
    }

    public BigDecimal getProtectedBalance() {
        return protectedBalance;
    }

    public void setProtectedBalance(BigDecimal protectedBalance) {
        this.protectedBalance = protectedBalance;
    }

    public BigDecimal getPendingDisplayMirror() {
        return pendingDisplayMirror;
    }

    public void setPendingDisplayMirror(BigDecimal pendingDisplayMirror) {
        this.pendingDisplayMirror = pendingDisplayMirror;
    }

    public int getKills() {
        return kills;
    }

    public void setKills(int kills) {
        this.kills = kills;
    }

    public int getDeaths() {
        return deaths;
    }

    public void setDeaths(int deaths) {
        this.deaths = deaths;
    }

    public Instant getSpawnShieldUntil() {
        return spawnShieldUntil;
    }

    public void setSpawnShieldUntil(Instant spawnShieldUntil) {
        this.spawnShieldUntil = spawnShieldUntil;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
