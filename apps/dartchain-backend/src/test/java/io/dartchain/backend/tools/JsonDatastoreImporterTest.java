package io.dartchain.backend.tools;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.dartchain.backend.blockchain.BlockchainSnapshot;
import io.dartchain.backend.blockchain.store.BlockchainStateStore;
import io.dartchain.backend.config.DataImportProperties;
import io.dartchain.backend.exchange.store.ExchangeLedgerStore;
import io.dartchain.backend.faucet.store.FaucetClaimStore;
import io.dartchain.backend.blockchain.model.Block;
import io.dartchain.backend.persistence.repository.UserJpaRepository;
import io.dartchain.backend.quests.store.QuestProgressStore;
import io.dartchain.backend.showcase.chat.store.ChatMessageStore;
import io.dartchain.backend.showcase.launch.store.LaunchProjectStore;
import io.dartchain.backend.showcase.news.store.NewsItemStore;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class JsonDatastoreImporterTest {

    @Mock
    private BlockchainStateStore blockchainStateStore;

    @Mock
    private UserJpaRepository userRepository;

    @Mock
    private QuestProgressStore questProgressStore;

    @Mock
    private FaucetClaimStore faucetClaimStore;

    @Mock
    private ExchangeLedgerStore exchangeLedgerStore;

    @Mock
    private LaunchProjectStore launchProjectStore;

    @Mock
    private ChatMessageStore chatMessageStore;

    @Mock
    private NewsItemStore newsItemStore;

    @TempDir
    Path tempDir;

    @Test
    void importAll_skipsMissingFiles() {
        DataImportProperties properties = missingOnlyProperties(tempDir);

        JsonDatastoreImporter importer = new JsonDatastoreImporter(
                new ObjectMapper(),
                properties,
                blockchainStateStore,
                userRepository,
                questProgressStore,
                faucetClaimStore,
                exchangeLedgerStore,
                launchProjectStore,
                chatMessageStore,
                newsItemStore
        );

        JsonDatastoreImportReport report = importer.importAll();

        assertThat(report.totalImported()).isZero();
        assertThat(report.getSkippedFiles()).hasSize(8);
    }

    private static DataImportProperties missingOnlyProperties(Path tempDir) {
        DataImportProperties properties = new DataImportProperties();
        properties.setBlockchainStatePath(tempDir.resolve("missing-blockchain.json").toString());
        properties.setAuthUsersPath(tempDir.resolve("missing-users.json").toString());
        properties.setQuestProgressPath(tempDir.resolve("missing-quests.json").toString());
        properties.setFaucetClaimsPath(tempDir.resolve("missing-faucet.json").toString());
        properties.setExchangeLedgerPath(tempDir.resolve("missing-exchange.json").toString());
        properties.setLaunchProjectsPath(tempDir.resolve("missing-launch.json").toString());
        properties.setChatMessagesPath(tempDir.resolve("missing-chat.json").toString());
        properties.setNewsItemsPath(tempDir.resolve("missing-news.json").toString());
        return properties;
    }

    @Test
    void importAll_importsBlockchainSnapshot() throws Exception {
        Path blockchainPath = tempDir.resolve("blockchain-state.json");
        Files.writeString(blockchainPath, """
                {
                  "blocks": [
                    {
                      "index": 0,
                      "timestamp": 1,
                      "hash": "genesis",
                      "previousHash": "0",
                      "nonce": 0,
                      "transactions": []
                    }
                  ],
                  "pendingPool": []
                }
                """);

        DataImportProperties properties = missingOnlyProperties(tempDir);
        properties.setBlockchainStatePath(blockchainPath.toString());

        JsonDatastoreImporter importer = new JsonDatastoreImporter(
                new ObjectMapper(),
                properties,
                blockchainStateStore,
                userRepository,
                questProgressStore,
                faucetClaimStore,
                exchangeLedgerStore,
                launchProjectStore,
                chatMessageStore,
                newsItemStore
        );

        JsonDatastoreImportReport report = importer.importAll();

        assertThat(report.getImportedCounts().get("blockchain")).isEqualTo(1);
        verify(blockchainStateStore).saveAll(anyList(), eq(List.of()));
    }
}
