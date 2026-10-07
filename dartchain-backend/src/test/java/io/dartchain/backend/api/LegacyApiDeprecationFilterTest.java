package io.dartchain.backend.api;

import io.dartchain.backend.config.ApiRoutes;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class LegacyApiDeprecationFilterTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void removedLegacyStats_returnsNotFoundWithMigrationHeaders() throws Exception {
        mockMvc.perform(get(ApiRoutes.LEGACY_STATS))
                .andExpect(status().isNotFound())
                .andExpect(header().string("Deprecation", "true"))
                .andExpect(header().string("Sunset", "2027-01-01"))
                .andExpect(header().string("Link", containsString(ApiRoutes.BLOCKCHAIN_STATS_V1)));
    }
}
