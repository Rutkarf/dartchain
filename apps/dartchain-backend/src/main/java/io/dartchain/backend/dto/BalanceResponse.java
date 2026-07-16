package io.dartchain.backend.dto;

public class BalanceResponse {

    private String address;
    private double balance;

    public BalanceResponse() {
    }

    public BalanceResponse(String address, double balance) {
        this.address = address;
        this.balance = balance;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public double getBalance() {
        return balance;
    }

    public void setBalance(double balance) {
        this.balance = balance;
    }
}