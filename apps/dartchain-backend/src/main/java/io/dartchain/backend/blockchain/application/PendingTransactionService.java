package io.dartchain.backend.blockchain.application;

import io.dartchain.backend.auth.UserAccount;
import io.dartchain.backend.blockchain.dto.AddPendingTransactionResponse;
import io.dartchain.backend.blockchain.dto.CreatePendingTransactionRequest;
import io.dartchain.backend.blockchain.dto.MinePendingTransactionResponse;
import io.dartchain.backend.blockchain.dto.PendingTransactionResponse;
import io.dartchain.backend.blockchain.model.PendingTransaction;

import java.util.List;

public interface PendingTransactionService {

    List<PendingTransactionResponse> getPendingTransactions();

    AddPendingTransactionResponse addPendingTransaction(
            CreatePendingTransactionRequest request,
            UserAccount account
    );

    MinePendingTransactionResponse minePendingTransaction(String id);

    List<PendingTransaction> getAll();

    boolean addFromPeer(PendingTransaction incoming);

    PendingTransaction findById(String id);

    boolean removeById(String id);
}