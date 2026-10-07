package io.dartchain.backend.auth;

import io.dartchain.backend.support.MockMvcIntegrationSupport;
import io.dartchain.backend.support.MockMvcIntegrationSupport.Session;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class AuthAcIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void mine_withoutAuth_isUnauthorized() throws Exception {
        mockMvc.perform(post("/api/blockchain/mine")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"minerAddress": "abc123"}
                                """))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void swap_withoutAuth_isUnauthorized() throws Exception {
        mockMvc.perform(post("/api/exchange-panel/swap")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "walletAddress": "abc123",
                                  "fromToken": "R4V3",
                                  "toToken": "BTC",
                                  "amount": "1"
                                }
                                """))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void addPeer_withoutAuth_isUnauthorized() throws Exception {
        mockMvc.perform(post("/api/peers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"peer": "ws://127.0.0.1:9999/ws/peers"}
                                """))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void addPeer_withAuth_isCreated() throws Exception {
        Session session = MockMvcIntegrationSupport.register(mockMvc);

        mockMvc.perform(post("/api/peers")
                        .header("Authorization", session.authHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"peer": "ws://127.0.0.1:9999/ws/peers"}
                                """))
                .andExpect(status().isCreated());
    }

    @Test
    void securityHeaders_arePresent() throws Exception {
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/health"))
                .andExpect(status().isOk())
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().string("X-Frame-Options", "DENY"));
    }

    @Test
    void register_rejectsShortPassword() throws Exception {
        String suffix = String.valueOf(System.nanoTime());

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "shortpw%s",
                                  "email": "shortpw%s@dartchain.dev",
                                  "password": "abc"
                                }
                                """.formatted(suffix, suffix)))
                .andExpect(status().isBadRequest());
    }
}
