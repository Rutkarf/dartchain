package io.dartchain.backend.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class ExchangeLedgerAdjustmentId implements Serializable {

    @Column(name = "wallet_address", nullable = false, length = 128)
    private String walletAddress;

    @Column(nullable = false, length = 16)
    private String token;

    public ExchangeLedgerAdjustmentId() {
    }

    public ExchangeLedgerAdjustmentId(String walletAddress, String token) {
        this.walletAddress = walletAddress;
        this.token = token;
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

    @Override
    public boolean equals(Object other) {
        if (this == other) {
            return true;
        }
        if (other == null || getClass() != other.getClass()) {
            return false;
        }
        ExchangeLedgerAdjustmentId that = (ExchangeLedgerAdjustmentId) other;
        return Objects.equals(walletAddress, that.walletAddress)
                && Objects.equals(token, that.token);
    }

    @Override
    public int hashCode() {
        return Objects.hash(walletAddress, token);
    }
}
