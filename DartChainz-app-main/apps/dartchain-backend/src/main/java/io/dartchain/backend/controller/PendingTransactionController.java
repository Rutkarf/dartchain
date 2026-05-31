package io.dartchain.backend.controller;

import io.dartchain.backend.dto.AddPendingTransactionResponse;
import io.dartchain.backend.dto.CreatePendingTransactionRequest;
import io.dartchain.backend.dto.MinePendingTransactionResponse;
import io.dartchain.backend.dto.PendingTransactionResponse;
import io.dartchain.backend.service.PendingTransactionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class PendingTransactionController {

    private final PendingTransactionService pendingTransactionService;

    @GetMapping("/pending-transactions")
    public List<PendingTransactionResponse> getPendingTransactions() {
        return pendingTransactionService.getPendingTransactions();
    }

    /** Alias frontend : `/api/transactions/pending` */
    @GetMapping("/transactions/pending")
    public List<PendingTransactionResponse> getPendingTransactionsAlias() {
        return pendingTransactionService.getPendingTransactions();
    }

    @PostMapping("/pending-transactions")
    public AddPendingTransactionResponse addPendingTransaction(
            @Valid @RequestBody CreatePendingTransactionRequest request
    ) {
        return pendingTransactionService.addPendingTransaction(request);
    }

    @PostMapping("/pending-transactions/{id}/mine")
    public MinePendingTransactionResponse minePendingTransaction(
            @PathVariable String id
    ) {
        return pendingTransactionService.minePendingTransaction(id);
    }
}