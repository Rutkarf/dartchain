package io.dartchain.backend.controller;

import io.dartchain.backend.support.MockMvcIntegrationSupport;
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
class WalletControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void verifyWallet_acceptsMatchingAddressAndPublicKey() throws Exception {
        WalletInfo wallet = MockMvcIntegrationSupport.createLocalWallet();

        mockMvc.perform(post("/api/wallets/verify")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "address": "%s",
                                  "publicKey": "%s"
                                }
                                """.formatted(wallet.address(), wallet.publicKey())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid").value(true))
                .andExpect(jsonPath("$.address").value(wallet.address()))
                .andExpect(jsonPath("$.signingModel").value("client-ecdsa-legacy"));
    }

    @Test
    void verifyWallet_rejectsMismatchedAddress() throws Exception {
        WalletInfo wallet = MockMvcIntegrationSupport.createLocalWallet();

        mockMvc.perform(post("/api/wallets/verify")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "address": "mismatch-address-1234567890abcdef",
                                  "publicKey": "%s"
                                }
                                """.formatted(wallet.publicKey())))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createClientWallet_registersPublicWallet() throws Exception {
        WalletInfo wallet = MockMvcIntegrationSupport.createLocalWallet();

        mockMvc.perform(post("/api/wallets/create-client")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "address": "%s",
                                  "publicKey": "%s"
                                }
                                """.formatted(wallet.address(), wallet.publicKey())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.address").value(wallet.address()))
                .andExpect(jsonPath("$.publicKey").value(wallet.publicKey()))
                .andExpect(jsonPath("$.signingModel").value("client-ecdsa-legacy"));
    }

    @Test
    void removedServerWalletCreate_returnsNotFound() throws Exception {
        mockMvc.perform(post("/api/wallets/create"))
                .andExpect(status().isNotFound());
    }
}
