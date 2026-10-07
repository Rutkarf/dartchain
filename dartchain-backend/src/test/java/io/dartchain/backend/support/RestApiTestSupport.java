package io.dartchain.backend.support;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.dartchain.backend.shared.utils.CryptoUtils;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.UUID;
import java.security.KeyPair;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

public final class RestApiTestSupport {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private RestApiTestSupport() {
    }

    public record Session(String token, String authHeader, String username) {
    }

    public record WalletInfo(String address, String publicKey) {
    }

    public static Session register(String baseUrl) throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String username = "p2p" + suffix;

        JsonNode body = postJson(
                baseUrl + "/api/auth/register",
                """
                        {
                          "username": "%s",
                          "email": "%s@dartchain.dev",
                          "password": "password123"
                        }
                        """.formatted(username, username),
                null
        );

        String token = body.path("token").asText();
        return new Session(token, "Bearer " + token, username);
    }

    public static WalletInfo createWallet(String baseUrl) {
        KeyPair keyPair = CryptoUtils.generateKeyPair();
        return new WalletInfo(
                CryptoUtils.addressFromPublicKey(keyPair.getPublic()),
                CryptoUtils.publicKeyToBase64(keyPair.getPublic())
        );
    }

    public static void linkWallet(String baseUrl, Session session, WalletInfo wallet) throws Exception {
        putJson(
                baseUrl + "/api/auth/me/wallet",
                """
                        {
                          "walletAddress": "%s",
                          "publicKey": "%s"
                        }
                        """.formatted(wallet.address(), wallet.publicKey()),
                session.authHeader()
        );
    }

    public static Session registerWithWallet(String baseUrl) throws Exception {
        Session session = register(baseUrl);
        WalletInfo wallet = createWallet(baseUrl);
        linkWallet(baseUrl, session, wallet);
        return session;
    }

    public static void mineBlock(String baseUrl, Session session, String minerAddress) throws Exception {
        postJson(
                baseUrl + "/api/blockchain/mine",
                """
                        {"minerAddress": "%s"}
                        """.formatted(minerAddress),
                session.authHeader()
        );
    }

    public static int chainLength(String baseUrl) throws Exception {
        JsonNode chain = getJson(baseUrl + "/api/blockchain/chain", null);
        return chain.isArray() ? chain.size() : 0;
    }

    public static int pendingCount(String baseUrl) throws Exception {
        JsonNode pending = getJson(baseUrl + "/api/pending-transactions", null);
        return pending.isArray() ? pending.size() : 0;
    }

    public static void addPendingTransaction(
            String baseUrl,
            Session session,
            String fromAddress,
            String toAddress
    ) throws Exception {
        postJson(
                baseUrl + "/api/pending-transactions",
                """
                        {
                          "fromAddress": "%s",
                          "toAddress": "%s",
                          "amount": "0.25",
                          "data": "phase-u-p2p"
                        }
                        """.formatted(fromAddress, toAddress),
                session.authHeader()
        );
    }

    public static Session registerWithWallet(MockMvc mockMvc) throws Exception {
        MockMvcIntegrationSupport.Session session = MockMvcIntegrationSupport.registerWithWallet(mockMvc);
        return new Session(session.token(), session.authHeader(), session.username());
    }

    public static WalletInfo createWallet(MockMvc mockMvc) throws Exception {
        MockMvcIntegrationSupport.WalletInfo wallet = MockMvcIntegrationSupport.createWallet(mockMvc);
        return new WalletInfo(wallet.address(), wallet.publicKey());
    }

    public static void mineBlock(MockMvc mockMvc, Session session, String minerAddress) throws Exception {
        mockMvc.perform(post("/api/blockchain/mine")
                        .header("Authorization", session.authHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"minerAddress": "%s"}
                                """.formatted(minerAddress)))
                .andExpect(status().isOk());
    }

    public static int chainLength(MockMvc mockMvc) throws Exception {
        MvcResult result = mockMvc.perform(get("/api/blockchain/chain"))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode chain = OBJECT_MAPPER.readTree(result.getResponse().getContentAsString());
        return chain.isArray() ? chain.size() : 0;
    }

    public static int pendingCount(MockMvc mockMvc) throws Exception {
        MvcResult result = mockMvc.perform(get("/api/pending-transactions"))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode pending = OBJECT_MAPPER.readTree(result.getResponse().getContentAsString());
        return pending.isArray() ? pending.size() : 0;
    }

    public static void addPeer(MockMvc mockMvc, Session session, String peerUrl) throws Exception {
        mockMvc.perform(post("/api/peers")
                        .header("Authorization", session.authHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"peer": "%s"}
                                """.formatted(peerUrl)))
                .andExpect(status().isCreated());
    }

    public static void reconnectPeer(MockMvc mockMvc, Session session, String peerUrl) throws Exception {
        mockMvc.perform(post("/api/peers/reconnect")
                        .header("Authorization", session.authHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"peer": "%s"}
                                """.formatted(peerUrl)))
                .andExpect(status().isOk());
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

    private static JsonNode postJson(String url, String body, String authorization) throws Exception {
        java.net.http.HttpClient client = java.net.http.HttpClient.newHttpClient();
        java.net.http.HttpRequest.Builder builder = java.net.http.HttpRequest.newBuilder()
                .uri(java.net.URI.create(url))
                .header("Content-Type", "application/json")
                .POST(java.net.http.HttpRequest.BodyPublishers.ofString(body));

        if (authorization != null) {
            builder.header("Authorization", authorization);
        }

        java.net.http.HttpResponse<String> response = client.send(
                builder.build(),
                java.net.http.HttpResponse.BodyHandlers.ofString()
        );

        if (response.statusCode() >= 400) {
            throw new IllegalStateException("HTTP " + response.statusCode() + " for POST " + url + ": " + response.body());
        }

        return OBJECT_MAPPER.readTree(response.body());
    }

    private static JsonNode getJson(String url, String authorization) throws Exception {
        java.net.http.HttpClient client = java.net.http.HttpClient.newHttpClient();
        java.net.http.HttpRequest.Builder builder = java.net.http.HttpRequest.newBuilder()
                .uri(java.net.URI.create(url))
                .GET();

        if (authorization != null) {
            builder.header("Authorization", authorization);
        }

        java.net.http.HttpResponse<String> response = client.send(
                builder.build(),
                java.net.http.HttpResponse.BodyHandlers.ofString()
        );

        if (response.statusCode() >= 400) {
            throw new IllegalStateException("HTTP " + response.statusCode() + " for GET " + url + ": " + response.body());
        }

        return OBJECT_MAPPER.readTree(response.body());
    }

    private static JsonNode putJson(String url, String body, String authorization) throws Exception {
        java.net.http.HttpClient client = java.net.http.HttpClient.newHttpClient();
        java.net.http.HttpRequest.Builder builder = java.net.http.HttpRequest.newBuilder()
                .uri(java.net.URI.create(url))
                .header("Content-Type", "application/json")
                .PUT(java.net.http.HttpRequest.BodyPublishers.ofString(body));

        if (authorization != null) {
            builder.header("Authorization", authorization);
        }

        java.net.http.HttpResponse<String> response = client.send(
                builder.build(),
                java.net.http.HttpResponse.BodyHandlers.ofString()
        );

        if (response.statusCode() >= 400) {
            throw new IllegalStateException("HTTP " + response.statusCode() + " for PUT " + url + ": " + response.body());
        }

        return OBJECT_MAPPER.readTree(response.body());
    }
}
