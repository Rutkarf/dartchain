package io.dartchain.backend.model;

import java.math.BigDecimal;

public class Wallet {

    private String address;
    private String publicKey;
    private String privateKey;
    private BigDecimal balance;

    public Wallet() {
        this.balance = BigDecimal.ZERO;
    }

    public Wallet(String address, String publicKey, String privateKey, BigDecimal balance) {
        this.address = address;
        this.publicKey = publicKey;
        this.privateKey = privateKey;
        this.balance = balance != null ? balance : BigDecimal.ZERO;
    }

    public String getAddress() {
        return address;
    }

    public String getPublicKey() {
        return publicKey;
    }

    public String getPrivateKey() {
        return privateKey;
    }

    public BigDecimal getBalance() {
        return balance;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public void setPublicKey(String publicKey) {
        this.publicKey = publicKey;
    }

    public void setPrivateKey(String privateKey) {
        this.privateKey = privateKey;
    }

    public void setBalance(BigDecimal balance) {
        this.balance = balance != null ? balance : BigDecimal.ZERO;
    }

    public void credit(BigDecimal amount) {
        if (amount == null) {
            return;
        }
        this.balance = this.balance.add(amount);
    }

    public void debit(BigDecimal amount) {
        if (amount == null) {
            return;
        }
        this.balance = this.balance.subtract(amount);
    }
}