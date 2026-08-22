package io.dartchain.backend.blockchain.application;

import io.dartchain.backend.auth.UserAccount;
import io.dartchain.backend.auth.store.UserAccountStore;
import io.dartchain.backend.config.SecurityProperties;
import io.dartchain.backend.shared.exception.TransactionValidationException;
import io.dartchain.backend.blockchain.model.PendingTransaction;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TransactionValidationServiceTest {

    @Mock
    private UserAccountStore userAccountStore;

    private PendingTransaction pending;
    private UserAccount account;

    @BeforeEach
    void setUp() {
        account = linkedAccount("user-strict", "alice-wallet");
        pending = samplePending("tx-strict", account);
    }

    @Test
    void strictMode_rejectsNonAuthSignature() {
        TransactionValidationService service = new TransactionValidationService(strictSecurity());

        pending.setSignature("0123456789012345678901234567890123456789012345678901234567890");

        assertThatThrownBy(() -> service.validatePendingTransaction(pending, userAccountStore))
                .isInstanceOf(TransactionValidationException.class)
                .hasMessageContaining("AUTHv1");
    }

    @Test
    void strictMode_rejectsSignedBackend() {
        TransactionValidationService service = new TransactionValidationService(strictSecurity());

        pending.setSignature("SIGNED_BACKEND");

        assertThatThrownBy(() -> service.validatePendingTransaction(pending, userAccountStore))
                .isInstanceOf(TransactionValidationException.class)
                .hasMessageContaining("legacy signature");
    }

    @Test
    void strictMode_acceptsValidAuthSignature() {
        TransactionValidationService service = new TransactionValidationService(strictSecurity());

        when(userAccountStore.findById(account.getId())).thenReturn(Optional.of(account));

        assertThatCode(() -> service.validatePendingTransaction(pending, userAccountStore))
                .doesNotThrowAnyException();
    }

    @Test
    void legacyMode_acceptsLongNonAuthSignature() {
        SecurityProperties properties = new SecurityProperties();
        properties.setStrictPendingSignatures(false);
        TransactionValidationService service = new TransactionValidationService(properties);

        pending.setSignature("0123456789012345678901234567890123456789012345678901234567890");

        assertThatCode(() -> service.validatePendingTransaction(pending, userAccountStore))
                .doesNotThrowAnyException();
    }

    private static SecurityProperties strictSecurity() {
        SecurityProperties properties = new SecurityProperties();
        properties.setStrictPendingSignatures(true);
        return properties;
    }

    private static UserAccount linkedAccount(String id, String wallet) {
        UserAccount account = new UserAccount();
        account.setId(id);
        account.setUsername("alice");
        account.setEmail("alice@dartchain.dev");
        account.setPasswordHash("hash");
        account.setPasswordSalt("");
        account.setCreatedAt(System.currentTimeMillis());
        account.setWalletAddress(wallet);
        account.setWalletPublicKey("public-key");
        return account;
    }

    private static PendingTransaction samplePending(String id, UserAccount account) {
        PendingTransaction pending = new PendingTransaction();
        pending.setId(id);
        pending.setHash("0123456789012345678901234567890123456789012345678901234567890");
        pending.setFromAddress(account.getWalletAddress());
        pending.setToAddress("bob-wallet");
        pending.setAmount(new BigDecimal("1.0"));
        pending.setData("payload");
        pending.setStatus("PENDING");
        pending.setCreatedAt(System.currentTimeMillis());
        pending.setSystemReward(false);
        pending.setSignature(PendingTransactionAttestation.sign(account, pending));
        return pending;
    }
}
