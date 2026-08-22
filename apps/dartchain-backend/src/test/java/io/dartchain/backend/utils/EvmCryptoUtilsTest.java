package io.dartchain.backend.utils;

import io.dartchain.backend.shared.utils.EvmCryptoUtils;
import io.dartchain.backend.shared.utils.Keccak256;
import io.dartchain.backend.shared.utils.WalletValidator;
import org.junit.jupiter.api.Test;

import java.security.KeyPair;

import static org.assertj.core.api.Assertions.assertThat;

class EvmCryptoUtilsTest {

    @Test
    void generatesEvmCompatibleAddress() {
        KeyPair keyPair = EvmCryptoUtils.generateKeyPair();
        String address = EvmCryptoUtils.addressFromPublicKey(keyPair.getPublic());

        assertThat(address).startsWith("0x");
        assertThat(address).hasSize(42);
        assertThat(WalletValidator.isEvmAddress(address)).isTrue();
    }

    @Test
    void signsAndVerifiesNativePayload() {
        KeyPair keyPair = EvmCryptoUtils.generateKeyPair();
        String from = EvmCryptoUtils.addressFromPublicKey(keyPair.getPublic());
        String payload = EvmCryptoUtils.buildNativePayload(
                3377L,
                0L,
                from,
                "0x0000000000000000000000000000000000000001",
                "1.5",
                1_700_000_000_000L,
                "phase-ad"
        );

        String signature = EvmCryptoUtils.sign(payload, keyPair.getPrivate());

        assertThat(EvmCryptoUtils.verify(payload, signature, keyPair.getPublic())).isTrue();
        assertThat(payload).startsWith("DCv1|3377|");
    }

    @Test
    void keccakProducesKnownLength() {
        byte[] hash = Keccak256.hash("dartchain-native".getBytes());
        assertThat(hash).hasSize(32);
    }
}
