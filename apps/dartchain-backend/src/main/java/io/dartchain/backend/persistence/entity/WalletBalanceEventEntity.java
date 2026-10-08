package io.dartchain.backend.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "wallet_balance_events")
public class WalletBalanceEventEntity {

    @Id
    private UUID id;

    @Column(name = "wallet_address", nullable = false, length = 128)
    private String walletAddress;

    @Column(nullable = false, length = 32)
    private String token;

    @Column(nullable = false, precision = 38, scale = 26)
    private BigDecimal delta;

    @Column(name = "balance_after", nullable = false, precision = 38, scale = 26)
    private BigDecimal balanceAfter;

    @Column(name = "chain_balance", precision = 38, scale = 26)
    private BigDecimal chainBalance;

    @Column(name = "ledger_adjustment", precision = 38, scale = 26)
    private BigDecimal ledgerAdjustment;

    @Column(name = "event_type", nullable = false, length = 32)
    private String eventType;

    @Column(columnDefinition = "TEXT")
    private String reference;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getWalletAddress() {
        return walletAddress;
    }

    public void setWalletAddress(String walletAddress) {
        this.walletAddress = walletAddress;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public BigDecimal getDelta() {
        return delta;
    }

    public void setDelta(BigDecimal delta) {
        this.delta = delta;
    }

    public BigDecimal getBalanceAfter() {
        return balanceAfter;
    }

    public void setBalanceAfter(BigDecimal balanceAfter) {
        this.balanceAfter = balanceAfter;
    }

    public BigDecimal getChainBalance() {
        return chainBalance;
    }

    public void setChainBalance(BigDecimal chainBalance) {
        this.chainBalance = chainBalance;
    }

    public BigDecimal getLedgerAdjustment() {
        return ledgerAdjustment;
    }

    public void setLedgerAdjustment(BigDecimal ledgerAdjustment) {
        this.ledgerAdjustment = ledgerAdjustment;
    }

    public String getEventType() {
        return eventType;
    }

    public void setEventType(String eventType) {
        this.eventType = eventType;
    }

    public String getReference() {
        return reference;
    }

    public void setReference(String reference) {
        this.reference = reference;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
