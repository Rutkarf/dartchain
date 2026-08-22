package io.dartchain.backend.tools;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.dartchain.backend.auth.model.AuthUserSnapshot;
import io.dartchain.backend.auth.model.UserAccount;
import io.dartchain.backend.blockchain.BlockchainSnapshot;
import io.dartchain.backend.blockchain.store.BlockchainStateStore;
import io.dartchain.backend.config.DataImportProperties;
import io.dartchain.backend.exchange.ExchangeLedgerSnapshot;
import io.dartchain.backend.exchange.store.ExchangeLedgerStore;
import io.dartchain.backend.faucet.FaucetClaimSnapshot;
import io.dartchain.backend.faucet.store.FaucetClaimStore;
import io.dartchain.backend.faucet.model.FaucetClaim;
import io.dartchain.backend.persistence.UserEntityMapper;
import io.dartchain.backend.persistence.entity.UserEntity;
import io.dartchain.backend.persistence.repository.UserJpaRepository;
import io.dartchain.backend.quests.model.QuestProgressSnapshot;
import io.dartchain.backend.quests.persistence.QuestProgressStore;
import io.dartchain.backend.showcase.chat.ChatMessageSnapshot;
import io.dartchain.backend.showcase.chat.store.ChatMessageStore;
import io.dartchain.backend.showcase.launch.LaunchProjectSnapshot;
import io.dartchain.backend.showcase.launch.store.LaunchProjectStore;
import io.dartchain.backend.showcase.news.NewsItemSnapshot;
import io.dartchain.backend.showcase.news.store.NewsItemStore;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

/**
 * Import one-shot des fichiers JSON legacy vers Postgres (Phase P).
 * Les stores JSON memory restent inchangés.
 */
@Component
@ConditionalOnProperty(name = "dartchain.persistence.mode", havingValue = "postgres")
public class JsonDatastoreImporter {

    private static final Logger log = LoggerFactory.getLogger(JsonDatastoreImporter.class);

    private final ObjectMapper objectMapper;
    private final DataImportProperties properties;
    private final BlockchainStateStore blockchainStateStore;
    private final UserJpaRepository userRepository;
    private final QuestProgressStore questProgressStore;
    private final FaucetClaimStore faucetClaimStore;
    private final ExchangeLedgerStore exchangeLedgerStore;
    private final LaunchProjectStore launchProjectStore;
    private final ChatMessageStore chatMessageStore;
    private final NewsItemStore newsItemStore;

    public JsonDatastoreImporter(
            ObjectMapper objectMapper,
            DataImportProperties properties,
            BlockchainStateStore blockchainStateStore,
            UserJpaRepository userRepository,
            QuestProgressStore questProgressStore,
            FaucetClaimStore faucetClaimStore,
            ExchangeLedgerStore exchangeLedgerStore,
            LaunchProjectStore launchProjectStore,
            ChatMessageStore chatMessageStore,
            NewsItemStore newsItemStore
    ) {
        this.objectMapper = objectMapper;
        this.properties = properties;
        this.blockchainStateStore = blockchainStateStore;
        this.userRepository = userRepository;
        this.questProgressStore = questProgressStore;
        this.faucetClaimStore = faucetClaimStore;
        this.exchangeLedgerStore = exchangeLedgerStore;
        this.launchProjectStore = launchProjectStore;
        this.chatMessageStore = chatMessageStore;
        this.newsItemStore = newsItemStore;
    }

    @Transactional
    public JsonDatastoreImportReport importAll() {
        JsonDatastoreImportReport report = new JsonDatastoreImportReport();

        importBlockchain(report);
        importUsers(report);
        importQuests(report);
        importFaucetClaims(report);
        importExchangeLedger(report);
        importLaunchProjects(report);
        importChatMessages(report);
        importNewsItems(report);

        log.info(
                "Import JSON → Postgres terminé : {} enregistrements importés, {} fichiers ignorés",
                report.totalImported(),
                report.getSkippedFiles().size()
        );
        return report;
    }

    private void importBlockchain(JsonDatastoreImportReport report) {
        Path path = Path.of(properties.getBlockchainStatePath());
        if (!Files.exists(path)) {
            report.recordSkipped("blockchain", "fichier absent: " + path);
            return;
        }

        try {
            BlockchainSnapshot snapshot = objectMapper.readValue(Files.readString(path), BlockchainSnapshot.class);
            blockchainStateStore.saveAll(snapshot.getBlocks(), snapshot.getPendingPool());
            int count = snapshot.getBlocks().size() + snapshot.getPendingPool().size();
            report.recordImported("blockchain", count);
        } catch (IOException exception) {
            throw new IllegalStateException("Import blockchain impossible: " + path, exception);
        }
    }

    private void importUsers(JsonDatastoreImportReport report) {
        Path path = Path.of(properties.getAuthUsersPath());
        if (!Files.exists(path)) {
            report.recordSkipped("users", "fichier absent: " + path);
            return;
        }

        try {
            AuthUserSnapshot snapshot = objectMapper.readValue(Files.readString(path), AuthUserSnapshot.class);
            List<UserAccount> users = snapshot.getUsers();
            if (users == null || users.isEmpty()) {
                report.recordImported("users", 0);
                return;
            }

            List<UserEntity> entities = users.stream().map(UserEntityMapper::toEntity).toList();
            userRepository.saveAll(entities);
            report.recordImported("users", entities.size());
        } catch (IOException exception) {
            throw new IllegalStateException("Import users impossible: " + path, exception);
        }
    }

    private void importQuests(JsonDatastoreImportReport report) {
        Path path = Path.of(properties.getQuestProgressPath());
        if (!Files.exists(path)) {
            report.recordSkipped("quests", "fichier absent: " + path);
            return;
        }

        try {
            QuestProgressSnapshot snapshot = objectMapper.readValue(Files.readString(path), QuestProgressSnapshot.class);
            int count = 0;
            for (QuestProgressSnapshot.QuestProgressEntry entry : snapshot.getEntries()) {
                if (entry.getUserId() == null || entry.getState() == null) {
                    continue;
                }
                questProgressStore.save(entry.getUserId(), entry.getState());
                count++;
            }
            report.recordImported("quests", count);
        } catch (IOException exception) {
            throw new IllegalStateException("Import quests impossible: " + path, exception);
        }
    }

    private void importFaucetClaims(JsonDatastoreImportReport report) {
        Path path = Path.of(properties.getFaucetClaimsPath());
        if (!Files.exists(path)) {
            report.recordSkipped("faucet-claims", "fichier absent: " + path);
            return;
        }

        try {
            FaucetClaimSnapshot snapshot = objectMapper.readValue(Files.readString(path), FaucetClaimSnapshot.class);
            int count = 0;
            for (FaucetClaim claim : snapshot.getClaims()) {
                faucetClaimStore.save(claim);
                count++;
            }
            report.recordImported("faucet-claims", count);
        } catch (IOException exception) {
            throw new IllegalStateException("Import faucet claims impossible: " + path, exception);
        }
    }

    private void importExchangeLedger(JsonDatastoreImportReport report) {
        Path path = Path.of(properties.getExchangeLedgerPath());
        if (!Files.exists(path)) {
            report.recordSkipped("exchange-ledger", "fichier absent: " + path);
            return;
        }

        try {
            ExchangeLedgerSnapshot snapshot = objectMapper.readValue(Files.readString(path), ExchangeLedgerSnapshot.class);
            int count = 0;

            for (String wallet : snapshot.getSeededWallets()) {
                if (exchangeLedgerStore.markSeededIfAbsent(wallet)) {
                    count++;
                }
            }

            for (Map.Entry<String, Map<String, String>> walletEntry : snapshot.getAdjustments().entrySet()) {
                for (Map.Entry<String, String> tokenEntry : walletEntry.getValue().entrySet()) {
                    exchangeLedgerStore.applyAdjustment(
                            walletEntry.getKey(),
                            tokenEntry.getKey(),
                            new BigDecimal(tokenEntry.getValue())
                    );
                    count++;
                }
            }

            report.recordImported("exchange-ledger", count);
        } catch (IOException exception) {
            throw new IllegalStateException("Import exchange ledger impossible: " + path, exception);
        }
    }

    private void importLaunchProjects(JsonDatastoreImportReport report) {
        Path path = Path.of(properties.getLaunchProjectsPath());
        if (!Files.exists(path)) {
            report.recordSkipped("launch-projects", "fichier absent: " + path);
            return;
        }

        try {
            LaunchProjectSnapshot snapshot = objectMapper.readValue(Files.readString(path), LaunchProjectSnapshot.class);
            launchProjectStore.saveAll(snapshot.getProjects());
            report.recordImported("launch-projects", snapshot.getProjects().size());
        } catch (IOException exception) {
            throw new IllegalStateException("Import launch projects impossible: " + path, exception);
        }
    }

    private void importChatMessages(JsonDatastoreImportReport report) {
        Path path = Path.of(properties.getChatMessagesPath());
        if (!Files.exists(path)) {
            report.recordSkipped("chat-messages", "fichier absent: " + path);
            return;
        }

        try {
            ChatMessageSnapshot snapshot = objectMapper.readValue(Files.readString(path), ChatMessageSnapshot.class);
            chatMessageStore.replaceAll(snapshot.getMessages());
            report.recordImported("chat-messages", snapshot.getMessages().size());
        } catch (IOException exception) {
            throw new IllegalStateException("Import chat messages impossible: " + path, exception);
        }
    }

    private void importNewsItems(JsonDatastoreImportReport report) {
        Path path = Path.of(properties.getNewsItemsPath());
        if (!Files.exists(path)) {
            report.recordSkipped("news-items", "fichier absent: " + path);
            return;
        }

        try {
            NewsItemSnapshot snapshot = objectMapper.readValue(Files.readString(path), NewsItemSnapshot.class);
            newsItemStore.saveAll(snapshot.getItems());
            report.recordImported("news-items", snapshot.getItems().size());
        } catch (IOException exception) {
            throw new IllegalStateException("Import news items impossible: " + path, exception);
        }
    }
}
