package io.dartchain.backend.persistence;

import io.dartchain.backend.chain.dto.ChainConfigResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.ResultSet;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest
@ActiveProfiles("postgres")
@AutoConfigureMockMvc
class PersistenceAdIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16")
            .withDatabaseName("dartchain")
            .withUsername("dartchain")
            .withPassword("dartchain");

    @DynamicPropertySource
    static void datasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("dartchain.persistence.mode", () -> "postgres");
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private DataSource dataSource;

    @Autowired
    private io.dartchain.backend.chain.ChainConfigService chainConfigService;

    @Test
    void chainConfigEndpoint_returnsEvmCompatibleMetadata() throws Exception {
        mockMvc.perform(get("/api/v1/chain/config"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.chainId").value(3377))
                .andExpect(jsonPath("$.nativeToken").value("R4V3"))
                .andExpect(jsonPath("$.evmCompatible").value(true))
                .andExpect(jsonPath("$.signingPayloadVersion").value("DCv1"));
    }

    @Test
    void flywayCreatesAdIndexesAndChainTables() throws Exception {
        try (Connection connection = dataSource.getConnection()) {
            assertIndexExists(connection, "idx_pending_from");
            assertIndexExists(connection, "idx_pending_to");
            assertIndexExists(connection, "idx_exchange_wallet");
            assertTableExists(connection, "chain_config");
            assertTableExists(connection, "chain_accounts");
        }
    }

    @Test
    void chainConfigService_readsSeededChainId() {
        ChainConfigResponse config = chainConfigService.getConfig();
        assertThat(config.chainId()).isEqualTo(3377L);
        assertThat(config.evmCompatible()).isTrue();
    }

    private void assertIndexExists(Connection connection, String indexName) throws Exception {
        try (var statement = connection.prepareStatement(
                "SELECT 1 FROM pg_indexes WHERE indexname = ?"
        )) {
            statement.setString(1, indexName);
            try (ResultSet resultSet = statement.executeQuery()) {
                assertThat(resultSet.next()).as("index " + indexName).isTrue();
            }
        }
    }

    private void assertTableExists(Connection connection, String tableName) throws Exception {
        try (ResultSet resultSet = connection.getMetaData().getTables(
                null,
                null,
                tableName,
                new String[] { "TABLE" }
        )) {
            assertThat(resultSet.next()).as("table " + tableName).isTrue();
        }
    }
}
