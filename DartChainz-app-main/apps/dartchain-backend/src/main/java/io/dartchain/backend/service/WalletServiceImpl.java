package io.dartchain.backend.service;

import io.dartchain.backend.model.Transaction;
import io.dartchain.backend.model.Wallet;
import io.dartchain.backend.utils.CryptoUtils;
import io.dartchain.backend.utils.HashUtils;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.security.KeyPair;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.util.UUID;

@Service
public class WalletServiceImpl implements WalletService {

    @Override
    public Wallet createWallet() {
        KeyPair keyPair = CryptoUtils.generateKeyPair();
        PublicKey publicKey = keyPair.getPublic();
        PrivateKey privateKey = keyPair.getPrivate();

        Wallet wallet = new Wallet();
        wallet.setAddress(CryptoUtils.addressFromPublicKey(publicKey));
        wallet.setPublicKey(CryptoUtils.publicKeyToBase64(publicKey));
        wallet.setPrivateKey(CryptoUtils.privateKeyToBase64(privateKey));
        wallet.setBalance(BigDecimal.ZERO);

        return wallet;
    }

    @Override
    public Transaction createSignedTransaction(
            String senderAddress,
            String senderPublicKey,
            String senderPrivateKey,
            String recipientAddress,
            BigDecimal amount
    ) {
        long timestamp = System.currentTimeMillis();

        PrivateKey privateKey = CryptoUtils.privateKeyFromBase64(senderPrivateKey);
        PublicKey publicKey = CryptoUtils.publicKeyFromBase64(senderPublicKey);
        String derivedAddress = CryptoUtils.addressFromPublicKey(publicKey);

        if (!derivedAddress.equals(senderAddress)) {
            throw new RuntimeException("La clé publique ne correspond pas à l'adresse sender");
        }

        String payload = senderAddress
                + "|" + recipientAddress
                + "|" + amount.stripTrailingZeros().toPlainString()
                + "|" + timestamp;

        String signature = CryptoUtils.sign(payload, privateKey);

        Transaction transaction = new Transaction();
        transaction.setId(UUID.randomUUID().toString());
        transaction.setSender(senderAddress);
        transaction.setRecipient(recipientAddress);
        transaction.setAmount(amount);
        transaction.setTimestamp(timestamp);
        transaction.setPayload(payload);
        transaction.setSignature(signature);
        transaction.setSystemReward(false);
        transaction.setStatus("PENDING");

        String txHashSeed =
                transaction.getId() + "|"
                        + transaction.getSender() + "|"
                        + transaction.getRecipient() + "|"
                        + transaction.getAmount().stripTrailingZeros().toPlainString() + "|"
                        + transaction.getTimestamp() + "|"
                        + transaction.getSignature();

        transaction.setHash(HashUtils.sha256(txHashSeed));

        return transaction;
    }
}