package io.dartchain.backend.blockchain.dto;

public class AddPendingTransactionResponse {

    private String message;
    private PendingTransactionResponse transaction;

    public AddPendingTransactionResponse() {
    }

    public AddPendingTransactionResponse(String message, PendingTransactionResponse transaction) {
        this.message = message;
        this.transaction = transaction;
    }

    public String getMessage() {
        return message;
    }

    public PendingTransactionResponse getTransaction() {
        return transaction;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public void setTransaction(PendingTransactionResponse transaction) {
        this.transaction = transaction;
    }
}