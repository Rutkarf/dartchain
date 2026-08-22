package io.dartchain.backend.blockchain;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.dartchain.backend.blockchain.store.BlockchainStateStore;
import io.dartchain.backend.blockchain.model.Block;
import io.dartchain.backend.blockchain.model.PendingTransaction;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

@Component
@ConditionalOnProperty(name = "dartchain.persistence.mode", havingValue = "memory", matchIfMissing = true)
public class JsonBlockchainStateStore implements BlockchainStateStore {

    private static final Logger log = LoggerFactory.getLogger(JsonBlockchainStateStore.class);

    private final ObjectMapper objectMapper;
    private final Path storePath;
    private BlockchainSnapshot cached = new BlockchainSnapshot();

    public JsonBlockchainStateStore(
            ObjectMapper objectMapper,
            @Value("${blockchain.state.path:data/blockchain-state.json}") String storePath
    ) {
        this.objectMapper = objectMapper;
        this.storePath = Path.of(storePath);
    }

    @PostConstruct
    public void loadFromDisk() {
        if (!Files.exists(storePath)) {
            return;
        }

        try {
            cached = objectMapper.readValue(
                    Files.readString(storePath),
                    BlockchainSnapshot.class
            );
        } catch (IOException exception) {
            throw new IllegalStateException("Unable to load blockchain state from " + storePath, exception);
        }
    }

    @Override
    public synchronized BlockchainSnapshot load() {
        return cloneSnapshot(cached);
    }

    @Override
    public synchronized void saveBlocks(List<Block> blocks) {
        cached.setBlocks(cloneBlocks(blocks));
        persist();
    }

    @Override
    public synchronized void savePendingPool(List<PendingTransaction> pendingPool) {
        cached.setPendingPool(clonePool(pendingPool));
        persist();
    }

    @Override
    public synchronized void saveAll(List<Block> blocks, List<PendingTransaction> pendingPool) {
        cached.setBlocks(cloneBlocks(blocks));
        cached.setPendingPool(clonePool(pendingPool));
        persist();
    }

    private void persist() {
        try {
            if (storePath.getParent() != null) {
                Files.createDirectories(storePath.getParent());
            }

            objectMapper.writerWithDefaultPrettyPrinter().writeValue(storePath.toFile(), cached);
        } catch (IOException exception) {
            log.warn("Unable to persist blockchain state to {}: {}", storePath, exception.getMessage());
        }
    }

    private BlockchainSnapshot cloneSnapshot(BlockchainSnapshot source) {
        BlockchainSnapshot copy = new BlockchainSnapshot();
        copy.setBlocks(cloneBlocks(source.getBlocks()));
        copy.setPendingPool(clonePool(source.getPendingPool()));
        return copy;
    }

    private List<Block> cloneBlocks(List<Block> blocks) {
        if (blocks == null) {
            return new ArrayList<>();
        }
        return blocks.stream()
                .map(block -> objectMapper.convertValue(block, Block.class))
                .toList();
    }

    private List<PendingTransaction> clonePool(List<PendingTransaction> pool) {
        if (pool == null) {
            return new ArrayList<>();
        }
        return pool.stream()
                .map(tx -> objectMapper.convertValue(tx, PendingTransaction.class))
                .toList();
    }
}
