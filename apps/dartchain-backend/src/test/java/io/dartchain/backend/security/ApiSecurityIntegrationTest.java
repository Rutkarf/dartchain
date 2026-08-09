package io.dartchain.backend.security;

import io.dartchain.backend.support.MockMvcIntegrationSupport;
import io.dartchain.backend.support.MockMvcIntegrationSupport.Session;
import io.dartchain.backend.support.MockMvcIntegrationSupport.WalletInfo;
import io.dartchain.backend.auth.AuthService;
import io.dartchain.backend.auth.dto.RegisterRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import io.dartchain.backend.support.AuthServiceTestSupport;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class ApiSecurityIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private AuthService authService;

    private String authHeader;

    @BeforeEach
    void setUp() {
        authHeader = "Bearer " + registerAndLogin();
    }

    @Test
    void publicHealthEndpoint_isAccessibleWithoutAuth() throws Exception {
        mockMvc.perform(get("/api/health"))
                .andExpect(status().isOk());
    }

    @Test
    void publicNewsFeed_isAccessibleWithoutAuth() throws Exception {
        mockMvc.perform(get("/api/showcase/news"))
                .andExpect(status().isOk());
    }

    @Test
    void faucetClaims_requiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/faucet/claims"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    void faucetClaims_withAuth_isAccessible() throws Exception {
        Session session = MockMvcIntegrationSupport.register(mockMvc);
        WalletInfo wallet = MockMvcIntegrationSupport.createWallet(mockMvc);
        MockMvcIntegrationSupport.linkWallet(mockMvc, session, wallet);

        mockMvc.perform(get("/api/faucet/claims").header("Authorization", session.authHeader()))
                .andExpect(status().isOk());
    }

    @Test
    void exchangeSwap_withoutAuth_isRejected() throws Exception {
        mockMvc.perform(post("/api/exchange-panel/swap")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "fromToken": "BTC",
                                  "toToken": "R4V3",
                                  "amount": 0.001,
                                  "walletAddress": "abc123wallet"
                                }
                                """))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void launchCreate_withoutAuth_isRejected() throws Exception {
        mockMvc.perform(post("/api/showcase/launch/projects")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Test",
                                  "symbol": "TST"
                                }
                                """))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void walletVerify_isAccessibleWithoutAuth() throws Exception {
        WalletInfo wallet = MockMvcIntegrationSupport.createWallet(mockMvc);

        mockMvc.perform(post("/api/wallets/verify")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "address": "%s",
                                  "publicKey": "%s"
                                }
                                """.formatted(wallet.address(), wallet.publicKey())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid").value(true));
    }

    @Test
    void launchCreate_withAuth_isAccepted() throws Exception {
        String symbol = "T" + UUID.randomUUID().toString().replace("-", "").substring(0, 6).toUpperCase();

        mockMvc.perform(post("/api/showcase/launch/projects")
                        .header("Authorization", authHeader)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Secure Token",
                                  "symbol": "%s"
                                }
                                """.formatted(symbol)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.symbol").value(symbol));
    }

    @Test
    void showcaseChatGet_isAccessibleWithoutAuth() throws Exception {
        mockMvc.perform(get("/api/showcase/chat/messages"))
                .andExpect(status().isOk());
    }

    @Test
    void showcaseChatPost_withoutAuth_isAcceptedAsAnonymous() throws Exception {
        mockMvc.perform(post("/api/showcase/chat/messages")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "author": "guest",
                                  "text": "hello-anon"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.author").value("Anonymous"))
                .andExpect(jsonPath("$.text").value("hello-anon"));
    }

    @Test
    void showcaseChatPost_withAuth_isAccepted() throws Exception {
        mockMvc.perform(post("/api/showcase/chat/messages")
                        .header("Authorization", authHeader)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "author": "secuser",
                                  "text": "phase-n-secured"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.text").value("phase-n-secured"));
    }

    private String registerAndLogin() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        var response = authService.register(new RegisterRequest(
                "secuser" + suffix,
                "secuser" + suffix + "@dartchain.dev",
                "password123"
        ), AuthServiceTestSupport.LOCAL_IP);
        return response.token();
    }
}
