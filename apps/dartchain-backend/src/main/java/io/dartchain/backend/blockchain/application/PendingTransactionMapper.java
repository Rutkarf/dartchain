package io.dartchain.backend.blockchain.application;

import io.dartchain.backend.blockchain.dto.PendingTransactionResponse;
import io.dartchain.backend.blockchain.model.Transaction;
import org.springframework.stereotype.Component;

public class PendingTransactionMapper {

    public PendingTransactionResponse toResponse(Transaction tx) {
        PendingTransactionResponse response = new PendingTransactionResponse();
        response.setId(tx.getId());
        response.setFromAddress(tx.getSender());
        response.setToAddress(tx.getRecipient());
        response.setAmount(tx.getAmount());
        response.setData(tx.getPayload());
        response.setSignature(tx.getSignature());
        response.setCreatedAt(tx.getTimestamp());

        // Seulement si ces champs existent vraiment dans Transaction
        // response.setHash(tx.getHash());
        // response.setStatus(tx.getStatus());
        // response.setSystemReward(tx.getSystemReward());

        return response;
    }
}