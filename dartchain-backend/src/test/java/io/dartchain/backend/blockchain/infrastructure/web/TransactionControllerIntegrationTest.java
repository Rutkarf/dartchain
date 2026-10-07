package io.dartchain.backend.blockchain.infrastructure.web;

import io.dartchain.backend.faucet.store.FaucetPendingBalanceStore;
import io.dartchain.backend.support.MockMvcIntegrationSupport;
import io.dartchain.backend.support.MockMvcIntegrationSupport.Session;
import io.dartchain.backend.support.MockMvcIntegrationSupport.WalletInfo;
import io.dartchain.backend.shared.utils.CryptoUtils;
import io.dartchain.backend.utils.TransactionPayloadBuilder;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class TransactionControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private FaucetPendingBalanceStore pendingBalanceStore;

    @Test
    void createTransaction_withoutAuth_isUnauthorized() throws Exception {
        WalletInfo wallet = MockMvcIntegrationSupport.createWallet(mockMvc);
        WalletInfo recipient = MockMvcIntegrationSupport.createWallet(mockMvc);

        mockMvc.perform(post("/api/transactions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "senderAddress": "%s",
                                  "senderPublicKey": "%s",
                                  "senderPrivateKey": "%s",
                                  "recipientAddress": "%s",
                                  "amount": "1.0"
                                }
                                """.formatted(
                                wallet.address(),
                                wallet.publicKey(),
                                wallet.privateKey(),
                                recipient.address())))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    void createTransaction_withLegacyPrivateKey_isForbidden() throws Exception {
        Session session = MockMvcIntegrationSupport.register(mockMvc);
        WalletInfo wallet = MockMvcIntegrationSupport.createLocalWallet();
        WalletInfo recipient = MockMvcIntegrationSupport.createLocalWallet();
        MockMvcIntegrationSupport.linkWallet(mockMvc, session, wallet);
        MockMvcIntegrationSupport.seedFaucetPending(
                pendingBalanceStore,
                wallet.address(),
                MockMvcIntegrationSupport.FAUCET_ITEST_PENDING);

        mockMvc.perform(post("/api/faucet/claim")
                        .header("Authorization", session.authHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"walletAddress": "%s"}
                                """.formatted(wallet.address())))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/transactions")
                        .header("Authorization", session.authHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "senderAddress": "%s",
                                  "senderPublicKey": "%s",
                                  "senderPrivateKey": "%s",
                                  "recipientAddress": "%s",
                                  "amount": "0.1",
                                  "memo": "phase-l"
                                }
                                """.formatted(
                                wallet.address(),
                                wallet.publicKey(),
                                wallet.privateKey(),
                                recipient.address())))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));
    }

    @Test
    void createTransaction_withClientSignature_doesNotRequirePrivateKeyInBody() throws Exception {
        Session session = MockMvcIntegrationSupport.register(mockMvc);
        WalletInfo wallet = MockMvcIntegrationSupport.createWallet(mockMvc);
        WalletInfo recipient = MockMvcIntegrationSupport.createWallet(mockMvc);
        MockMvcIntegrationSupport.linkWallet(mockMvc, session, wallet);
        MockMvcIntegrationSupport.seedFaucetPending(
                pendingBalanceStore,
                wallet.address(),
                MockMvcIntegrationSupport.FAUCET_ITEST_PENDING);

        mockMvc.perform(post("/api/faucet/claim")
                        .header("Authorization", session.authHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"walletAddress": "%s"}
                                """.formatted(wallet.address())))
                .andExpect(status().isCreated());

        long timestamp = 1_700_000_123_456L;
        String memo = "phase-m-signed";
        BigDecimal amount = new BigDecimal("0.1");
        String payload = TransactionPayloadBuilder.build(
                wallet.address(),
                recipient.address(),
                amount,
                timestamp,
                memo
        );
        String signature = CryptoUtils.sign(
                payload,
                CryptoUtils.privateKeyFromBase64(wallet.privateKey())
        );

        mockMvc.perform(post("/api/transactions")
                        .header("Authorization", session.authHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "senderAddress": "%s",
                                  "senderPublicKey": "%s",
                                  "recipientAddress": "%s",
                                  "amount": "0.1",
                                  "memo": "%s",
                                  "timestamp": %d,
                                  "payload": "%s",
                                  "signature": "%s"
                                }
                                """.formatted(
                                wallet.address(),
                                wallet.publicKey(),
                                recipient.address(),
                                memo,
                                timestamp,
                                payload,
                                signature)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.hash").isNotEmpty())
                .andExpect(jsonPath("$.payload").value(payload))
                .andExpect(jsonPath("$.signature").value(signature));
    }

    @Test
    void createTransaction_withInvalidClientSignature_isBadRequest() throws Exception {
        Session session = MockMvcIntegrationSupport.register(mockMvc);
        WalletInfo wallet = MockMvcIntegrationSupport.createWallet(mockMvc);
        WalletInfo recipient = MockMvcIntegrationSupport.createWallet(mockMvc);
        MockMvcIntegrationSupport.linkWallet(mockMvc, session, wallet);

        long timestamp = 1_700_000_123_456L;
        String payload = TransactionPayloadBuilder.build(
                wallet.address(),
                recipient.address(),
                new BigDecimal("0.1"),
                timestamp,
                null
        );

        mockMvc.perform(post("/api/transactions")
                        .header("Authorization", session.authHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "senderAddress": "%s",
                                  "senderPublicKey": "%s",
                                  "recipientAddress": "%s",
                                  "amount": "0.1",
                                  "timestamp": %d,
                                  "payload": "%s",
                                  "signature": "invalid-signature"
                                }
                                """.formatted(
                                wallet.address(),
                                wallet.publicKey(),
                                recipient.address(),
                                timestamp,
                                payload)))
                .andExpect(status().isBadRequest());
    }
}
