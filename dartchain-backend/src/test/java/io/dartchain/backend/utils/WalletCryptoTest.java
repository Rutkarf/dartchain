package io.dartchain.backend.utils;

import io.dartchain.backend.wallet.application.WalletServiceImpl;
import io.dartchain.backend.shared.utils.EvmCryptoUtils;
import io.dartchain.backend.shared.utils.CryptoUtils;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.security.KeyPair;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class WalletCryptoTest {

    @Test
    void payloadBuilder_matchesLegacyFormat() {
        String payload = TransactionPayloadBuilder.build(
                "sender",
                "recipient",
                new BigDecimal("0.10000000"),
                42L,
                "memo"
        );

        assertThat(payload).isEqualTo("sender|recipient|0.1|42|memo");
    }

    @Test
    void createVerifiedTransaction_acceptsValidSignature() {
        KeyPair keyPair = CryptoUtils.generateKeyPair();
        String publicKey = CryptoUtils.publicKeyToBase64(keyPair.getPublic());
        String privateKey = CryptoUtils.privateKeyToBase64(keyPair.getPrivate());
        String senderAddress = CryptoUtils.addressFromPublicKey(keyPair.getPublic());
        String recipient = "recipient1234567890abcdef";
        long timestamp = 1_700_000_000_000L;
        BigDecimal amount = new BigDecimal("0.25");
        String memo = "phase-m";

        String payload = TransactionPayloadBuilder.build(
                senderAddress,
                recipient,
                amount,
                timestamp,
                memo
        );
        String signature = CryptoUtils.sign(payload, keyPair.getPrivate());

        var service = new WalletServiceImpl(new io.dartchain.backend.chain.ChainConfigService(
                new io.dartchain.backend.config.ChainProperties(),
                null,
                null
        ));
        var transaction = service.createVerifiedTransaction(
                senderAddress,
                publicKey,
                recipient,
                amount,
                memo,
                timestamp,
                payload,
                signature
        );

        assertThat(transaction.getSender()).isEqualTo(senderAddress);
        assertThat(transaction.getRecipient()).isEqualTo(recipient);
        assertThat(transaction.getPayload()).isEqualTo(payload);
        assertThat(transaction.getSignature()).isEqualTo(signature);
        assertThat(transaction.getHash()).isNotBlank();
    }

    @Test
    void createVerifiedTransaction_rejectsInvalidSignature() {
        KeyPair keyPair = CryptoUtils.generateKeyPair();
        String publicKey = CryptoUtils.publicKeyToBase64(keyPair.getPublic());
        String senderAddress = CryptoUtils.addressFromPublicKey(keyPair.getPublic());
        String recipient = "recipient1234567890abcdef";
        long timestamp = 1_700_000_000_000L;
        BigDecimal amount = new BigDecimal("1");
        String payload = TransactionPayloadBuilder.build(
                senderAddress,
                recipient,
                amount,
                timestamp,
                null
        );

        var service = new WalletServiceImpl(new io.dartchain.backend.chain.ChainConfigService(
                new io.dartchain.backend.config.ChainProperties(),
                null,
                null
        ));
        assertThatThrownBy(() -> service.createVerifiedTransaction(
                senderAddress,
                publicKey,
                recipient,
                amount,
                null,
                timestamp,
                payload,
                "invalid-signature-value"
        )).isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("signature ECDSA invalide");
    }

    @Test
    void verifyWallet_matchesDerivedAddress() {
        KeyPair keyPair = CryptoUtils.generateKeyPair();
        String publicKey = CryptoUtils.publicKeyToBase64(keyPair.getPublic());
        String address = CryptoUtils.addressFromPublicKey(keyPair.getPublic());

        var service = new WalletServiceImpl(new io.dartchain.backend.chain.ChainConfigService(
                new io.dartchain.backend.config.ChainProperties(),
                null,
                null
        ));
        var response = service.verifyWallet(address, publicKey);

        assertThat(response.valid()).isTrue();
        assertThat(response.address()).isEqualTo(address);
        assertThat(response.signingModel()).isEqualTo("client-ecdsa-legacy");
    }

    @Test
    void verifyWallet_supportsEvmAddresses() {
        KeyPair keyPair = EvmCryptoUtils.generateKeyPair();
        String publicKey = EvmCryptoUtils.publicKeyToBase64(keyPair.getPublic());
        String address = EvmCryptoUtils.addressFromPublicKey(keyPair.getPublic());

        var service = new WalletServiceImpl(new io.dartchain.backend.chain.ChainConfigService(
                new io.dartchain.backend.config.ChainProperties(),
                null,
                null
        ));
        var response = service.verifyWallet(address, publicKey);

        assertThat(response.valid()).isTrue();
        assertThat(response.address()).isEqualTo(address);
        assertThat(response.signingModel()).isEqualTo("client-ecdsa-evm");
    }
}
