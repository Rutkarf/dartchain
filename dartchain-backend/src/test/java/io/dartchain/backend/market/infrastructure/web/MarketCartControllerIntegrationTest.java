package io.dartchain.backend.market.infrastructure.web;

import io.dartchain.backend.support.MockMvcIntegrationSupport;
import io.dartchain.backend.support.MockMvcIntegrationSupport.Session;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class MarketCartControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void cart_requiresAuth() throws Exception {
        mockMvc.perform(get("/api/market/cart"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void cart_replaceAndGet_withAuth() throws Exception {
        Session session = MockMvcIntegrationSupport.register(mockMvc);

        mockMvc.perform(put("/api/market/cart")
                        .header("Authorization", session.authHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "items": [
                                    {
                                      "exchangeToken": "PXD",
                                      "displaySymbol": "PXD",
                                      "name": "Pixel Drop",
                                      "offerKind": "nft",
                                      "quantity": 2,
                                      "unitPriceR4v3": 0.05
                                    }
                                  ]
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.itemCount").value(2))
                .andExpect(jsonPath("$.items[0].exchangeToken").value("PXD"));

        mockMvc.perform(get("/api/market/cart")
                        .header("Authorization", session.authHeader()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.itemCount").value(2))
                .andExpect(jsonPath("$.totalR4v3").value(0.1));
    }
}
