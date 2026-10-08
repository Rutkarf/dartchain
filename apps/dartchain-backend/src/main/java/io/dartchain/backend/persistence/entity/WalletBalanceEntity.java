package io.dartchain.backend.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "wallet_balances")
public class WalletBalanceEntity {

    @EmbeddedId
    private WalletBalanceId id;

    @Column(nullable = false, precision = 38, scale = 26)
    private BigDecimal balance;

    @Column(name = "chain_balance", nullable = false, precision = 38, scale = 26)
    private BigDecimal chainBalance = BigDecimal.ZERO;

    @Column(name = "ledger_adjustment", nullable = false, precision = 38, scale = 26)
    private BigDecimal ledgerAdjustment = BigDecimal.ZERO;

    @Column(nullable = false, length = 32)
    private String source = "SYNC";

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public WalletBalanceId getId() {
        return id;
    }

    public void setId(WalletBalanceId id) {
        this.id = id;
    }

    public BigDecimal getBalance() {
        return balance;
    }

    public void setBalance(BigDecimal balance) {
        this.balance = balance;
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

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
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
