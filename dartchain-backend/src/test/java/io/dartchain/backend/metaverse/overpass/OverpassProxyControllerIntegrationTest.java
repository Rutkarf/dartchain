package io.dartchain.backend.metaverse.overpass;

import io.dartchain.backend.metaverse.infrastructure.web.OverpassProxyService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class OverpassProxyControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private OverpassProxyService overpassProxyService;

    @Test
    void postOverpass_isPublic_andReturnsJson() throws Exception {
        when(overpassProxyService.forward(anyString())).thenReturn("{\"elements\":[]}");

        mockMvc.perform(
                        post("/api/metaverse/overpass")
                                .contentType(MediaType.TEXT_PLAIN)
                                .content("[out:json][timeout:15];\nway[\"building\"](43.29,5.36,43.30,5.38);\nout;")
                )
                .andExpect(status().isOk())
                .andExpect(content().json("{\"elements\":[]}"));
    }
}
