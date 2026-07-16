package io.dartchain.backend.service;

import io.dartchain.backend.auth.UserAccount;
import io.dartchain.backend.dto.AddPendingTransactionResponse;
import io.dartchain.backend.dto.CreatePendingTransactionRequest;
import io.dartchain.backend.dto.MinePendingTransactionResponse;
import io.dartchain.backend.dto.PendingTransactionResponse;
import io.dartchain.backend.model.PendingTransaction;

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