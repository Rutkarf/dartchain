package io.dartchain.backend.controller;

import io.dartchain.backend.auth.AuthService;
import io.dartchain.backend.dto.CreateTransactionRequest;
import io.dartchain.backend.dto.TransactionResponse;
import io.dartchain.backend.model.Transaction;
import io.dartchain.backend.service.BlockchainService;
import io.dartchain.backend.product.ProductFeatureService;
import io.dartchain.backend.service.WalletService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class TransactionController {

    private final WalletService walletService;
    private final BlockchainService blockchainService;
    private final AuthService authService;
    private final ProductFeatureService productFeatures;

    @PostMapping("/transactions")
    public TransactionResponse createTransaction(
            @Valid @RequestBody CreateTransactionRequest request,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        var account = authService.requireAuthenticatedAccount(authorization);
        authService.ensureWalletOwnership(account, request.getSenderAddress());
        if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("amount must be greater than 0");
        }

        Transaction transaction = resolveTransaction(request);
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

    private Transaction resolveTransaction(CreateTransactionRequest request) {
        if (request.hasClientSignature()) {
            return walletService.createVerifiedTransaction(
                    request.getSenderAddress(),
                    request.getSenderPublicKey(),
                    request.getRecipientAddress(),
                    request.getAmount(),
                    request.getMemo(),
                    request.getTimestamp(),
                    request.getPayload(),
                    request.getSignature()
            );
        }

        if (request.hasLegacyPrivateKey()) {
            productFeatures.requireLegacyPrivateKey();
            return walletService.createSignedTransaction(
                    request.getSenderAddress(),
                    request.getSenderPublicKey(),
                    request.getSenderPrivateKey(),
                    request.getRecipientAddress(),
                    request.getAmount(),
                    request.getMemo()
            );
        }

        throw new IllegalArgumentException(
                "signature client (payload + timestamp + signature) ou senderPrivateKey legacy requis"
        );
    }
}
