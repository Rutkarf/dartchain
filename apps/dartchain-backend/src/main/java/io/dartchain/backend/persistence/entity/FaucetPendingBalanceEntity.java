package io.dartchain.backend.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;

@Entity
@Table(name = "faucet_pending_balances")
public class FaucetPendingBalanceEntity {

    @Id
    @Column(name = "wallet_address", length = 128)
    private String walletAddress;

    @Column(nullable = false, precision = 38, scale = 26)
    private BigDecimal amount;

    public String getWalletAddress() {
        return walletAddress;
    }

    public void setWalletAddress(String walletAddress) {
        this.walletAddress = walletAddress;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }
}
