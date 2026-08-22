package io.dartchain.backend.peers.infrastructure.web;

import io.dartchain.backend.support.MockMvcIntegrationSupport;
import io.dartchain.backend.support.MockMvcIntegrationSupport.Session;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class PeerControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void getPeers_isPublic() throws Exception {
        mockMvc.perform(get("/api/peers"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    void getPeerStats_isPublic() throws Exception {
        mockMvc.perform(get("/api/peers/stats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active").exists())
                .andExpect(jsonPath("$.total").exists())
                .andExpect(jsonPath("$.networkLoadPercent").exists());
    }

    @Test
    void addPeer_withoutAuth_isUnauthorized() throws Exception {
        mockMvc.perform(post("/api/peers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"peer": "ws://127.0.0.1:8080/ws/peers"}
                                """))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    void addPeer_withAuth_createsPeerEntry() throws Exception {
        Session session = MockMvcIntegrationSupport.register(mockMvc);
        int port = 20_000 + Math.floorMod(UUID.randomUUID().hashCode(), 10_000);
        String peerUrl = "ws://127.0.0.1:" + port + "/ws/peers";

        mockMvc.perform(post("/api/peers")
                        .header("Authorization", session.authHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"peer": "%s"}
                                """.formatted(peerUrl)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.ok").value(true))
                .andExpect(jsonPath("$.peer").value(peerUrl))
                .andExpect(jsonPath("$.status").exists());

        mockMvc.perform(get("/api/peers"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].url").value(peerUrl))
                .andExpect(jsonPath("$[0].syncPercent").exists());

        mockMvc.perform(post("/api/peers/disconnect")
                        .header("Authorization", session.authHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"peer": "%s"}
                                """.formatted(peerUrl)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ok").value(true))
                .andExpect(jsonPath("$.peer").value(peerUrl))
                .andExpect(jsonPath("$.status").value("DISCONNECTED"));

        mockMvc.perform(get("/api/peers"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.url=='%s')]".formatted(peerUrl)).isEmpty());
    }
}
