package io.dartchain.backend.wallet.application;

import io.dartchain.backend.wallet.dto.WalletPublicView;
import io.dartchain.backend.wallet.dto.WalletVerifyResponse;
import io.dartchain.backend.blockchain.model.Transaction;
import io.dartchain.backend.wallet.model.Wallet;
import io.dartchain.backend.chain.AddressScheme;
import io.dartchain.backend.chain.ChainConfigService;
import io.dartchain.backend.shared.utils.CryptoUtils;
import io.dartchain.backend.shared.utils.EvmCryptoUtils;
import io.dartchain.backend.shared.utils.WalletValidator;
import io.dartchain.backend.shared.utils.HashUtils;
import io.dartchain.backend.utils.TransactionPayloadBuilder;
import io.dartchain.backend.wallet.application.WalletService;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.security.KeyPair;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.util.UUID;

@Service
public class WalletServiceImpl implements WalletService {

    private static final String CLIENT_SIGNING_MODEL_LEGACY = "client-ecdsa-legacy";
    private static final String CLIENT_SIGNING_MODEL_EVM = "client-ecdsa-evm";

    private final ChainConfigService chainConfigService;

    public WalletServiceImpl(ChainConfigService chainConfigService) {
        this.chainConfigService = chainConfigService;
    }

    @Override
    public Transaction createSignedTransaction(
            String senderAddress,
            String senderPublicKey,
            String senderPrivateKey,
            String recipientAddress,
            BigDecimal amount,
            String memo
    ) {
        long timestamp = System.currentTimeMillis();

        PrivateKey privateKey = CryptoUtils.privateKeyFromBase64(senderPrivateKey);
        PublicKey publicKey = CryptoUtils.publicKeyFromBase64(senderPublicKey);
        String derivedAddress = CryptoUtils.addressFromPublicKey(publicKey);

        if (!derivedAddress.equals(senderAddress)) {
            throw new RuntimeException("La clé publique ne correspond pas à l'adresse sender");
        }

        String payload = TransactionPayloadBuilder.build(
                senderAddress,
                recipientAddress,
                amount,
                timestamp,
                memo
        );

        String signature = CryptoUtils.sign(payload, privateKey);
        return buildTransaction(
                senderAddress,
                recipientAddress,
                amount,
                timestamp,
                payload,
                signature
        );
    }

    @Override
    public Transaction createVerifiedTransaction(
            String senderAddress,
            String senderPublicKey,
            String recipientAddress,
            BigDecimal amount,
            String memo,
            long timestamp,
            String payload,
            String signature
    ) {
        PublicKey publicKey = CryptoUtils.publicKeyFromBase64(senderPublicKey);
        String derivedAddress = CryptoUtils.addressFromPublicKey(publicKey);

        if (!derivedAddress.equals(senderAddress)) {
            throw new IllegalArgumentException("La clé publique ne correspond pas à l'adresse sender");
        }

        String expectedPayload = TransactionPayloadBuilder.build(
                senderAddress,
                recipientAddress,
                amount,
                timestamp,
                memo
        );

        if (!expectedPayload.equals(payload)) {
            throw new IllegalArgumentException("payload signature invalide");
        }

        if (!CryptoUtils.verifyClientSignature(payload, signature, publicKey)) {
            throw new IllegalArgumentException("signature ECDSA invalide");
        }

        return buildTransaction(
                senderAddress,
                recipientAddress,
                amount,
                timestamp,
                payload,
                signature
        );
    }

    @Override
    public WalletPublicView toPublicView(Wallet wallet) {
        if (wallet == null) {
            return null;
        }

        return new WalletPublicView(
                wallet.getAddress(),
                wallet.getPublicKey(),
                wallet.getBalance(),
                WalletValidator.detectScheme(wallet.getAddress()) == AddressScheme.EVM
                        ? CLIENT_SIGNING_MODEL_EVM
                        : CLIENT_SIGNING_MODEL_LEGACY
        );
    }

    @Override
    public WalletVerifyResponse verifyWallet(String address, String publicKeyBase64) {
        String normalized = WalletValidator.normalize(address);
        AddressScheme scheme = WalletValidator.detectScheme(normalized);

        if (scheme == AddressScheme.EVM) {
            PublicKey publicKey = EvmCryptoUtils.publicKeyFromBase64(publicKeyBase64);
            String derivedAddress = EvmCryptoUtils.addressFromPublicKey(publicKey);
            boolean valid = derivedAddress.equalsIgnoreCase(normalized);

            if (valid) {
                chainConfigService.registerEvmAccount(derivedAddress, publicKeyBase64);
            }

            return new WalletVerifyResponse(
                    valid,
                    derivedAddress,
                    publicKeyBase64,
                    CLIENT_SIGNING_MODEL_EVM
            );
        }

        PublicKey publicKey = CryptoUtils.publicKeyFromBase64(publicKeyBase64);
        String derivedAddress = CryptoUtils.addressFromPublicKey(publicKey);
        boolean valid = derivedAddress.equalsIgnoreCase(normalized);

        return new WalletVerifyResponse(
                valid,
                derivedAddress,
                publicKeyBase64,
                CLIENT_SIGNING_MODEL_LEGACY
        );
    }

    private Transaction buildTransaction(
            String senderAddress,
            String recipientAddress,
            BigDecimal amount,
            long timestamp,
            String payload,
            String signature
    ) {
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
                        + TransactionPayloadBuilder.formatAmount(transaction.getAmount()) + "|"
                        + transaction.getTimestamp() + "|"
                        + transaction.getSignature();

        transaction.setHash(HashUtils.sha256(txHashSeed));
        return transaction;
    }
}
