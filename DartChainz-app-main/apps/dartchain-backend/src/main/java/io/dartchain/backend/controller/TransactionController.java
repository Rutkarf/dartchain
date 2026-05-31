package io.dartchain.backend.controller;

import io.dartchain.backend.dto.CreateTransactionRequest;
import io.dartchain.backend.dto.TransactionResponse;
import io.dartchain.backend.model.Transaction;
import io.dartchain.backend.service.BlockchainService;
import io.dartchain.backend.service.WalletService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class TransactionController {

    private final WalletService walletService;
    private final BlockchainService blockchainService;

    @PostMapping("/transactions")
    public TransactionResponse createTransaction(@Valid @RequestBody CreateTransactionRequest request) {
        if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("amount must be greater than 0");
        }

        Transaction transaction = walletService.createSignedTransaction(
                request.getSenderAddress(),
                request.getSenderPublicKey(),
                request.getSenderPrivateKey(),
                request.getRecipientAddress(),
                request.getAmount()
        );

        blockchainService.addTransaction(transaction, request.getSenderPublicKey());

        return new TransactionResponse(
                transaction.getId(),
                transaction.getHash(),
                transaction.getSender(),
                transaction.getRecipient(),
                transaction.getAmount(),
                transaction.getTimestamp(),
                transaction.getSignature(),
                transaction.getSystemReward(),
                transaction.getPayload(),
                transaction.getStatus()
        );
    }
}