package io.dartchain.backend.support;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.dartchain.backend.shared.utils.CryptoUtils;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.UUID;
import java.security.KeyPair;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

public final class MockMvcIntegrationSupport {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private MockMvcIntegrationSupport() {
    }

    public record Session(String token, String authHeader, String username, String userId) {
    }

    public record WalletInfo(String address, String publicKey, String privateKey) {
    }

    public static Session register(MockMvc mockMvc) throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String username = "itest" + suffix;

        MvcResult result = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "%s",
                                  "email": "%s@dartchain.dev",
                                  "password": "password123"
                                }
                                """.formatted(username, username)))
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode body = OBJECT_MAPPER.readTree(result.getResponse().getContentAsString());
        String token = body.path("token").asText();
        return new Session(
                token,
                "Bearer " + token,
                username,
                body.path("user").path("id").asText()
        );
    }

    public static WalletInfo createWallet(MockMvc mockMvc) {
        return createLocalWallet();
    }

    /** Phase Z — wallet généré localement (sans {@code POST /api/wallets/create}). */
    public static WalletInfo createLocalWallet() {
        KeyPair keyPair = CryptoUtils.generateKeyPair();
        return new WalletInfo(
                CryptoUtils.addressFromPublicKey(keyPair.getPublic()),
                CryptoUtils.publicKeyToBase64(keyPair.getPublic()),
                CryptoUtils.privateKeyToBase64(keyPair.getPrivate())
        );
    }

    public static void linkWallet(MockMvc mockMvc, Session session, WalletInfo wallet) throws Exception {
        mockMvc.perform(put("/api/auth/me/wallet")
                        .header("Authorization", session.authHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "walletAddress": "%s",
                                  "publicKey": "%s"
                                }
                                """.formatted(wallet.address(), wallet.publicKey())))
                .andExpect(status().isOk());
    }

    public static Session registerWithWallet(MockMvc mockMvc) throws Exception {
        Session session = register(mockMvc);
        WalletInfo wallet = createLocalWallet();
        linkWallet(mockMvc, session, wallet);
        return session;
    }
}
