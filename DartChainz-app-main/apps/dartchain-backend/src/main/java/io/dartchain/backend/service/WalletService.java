package io.dartchain.backend.service;

import io.dartchain.backend.model.Wallet;
import io.dartchain.backend.model.Transaction;

import java.math.BigDecimal;

public interface WalletService {

    Wallet createWallet();

    Transaction createSignedTransaction(
            String senderAddress,
            String senderPublicKey,
            String senderPrivateKey,
            String recipientAddress,
            BigDecimal amount
    );
}