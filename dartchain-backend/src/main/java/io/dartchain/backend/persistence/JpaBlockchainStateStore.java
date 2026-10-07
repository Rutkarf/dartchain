package io.dartchain.backend.persistence;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.dartchain.backend.blockchain.BlockchainSnapshot;
import io.dartchain.backend.blockchain.store.BlockchainStateStore;
import io.dartchain.backend.blockchain.model.Block;
import io.dartchain.backend.blockchain.model.PendingTransaction;
import io.dartchain.backend.blockchain.model.Transaction;
import io.dartchain.backend.persistence.entity.BlockEntity;
import io.dartchain.backend.persistence.entity.PendingTransactionEntity;
import io.dartchain.backend.persistence.repository.BlockJpaRepository;
import io.dartchain.backend.persistence.repository.PendingTransactionJpaRepository;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Component
@ConditionalOnProperty(name = "dartchain.persistence.mode", havingValue = "postgres")
public class JpaBlockchainStateStore implements BlockchainStateStore {

    private static final TypeReference<List<Transaction>> TX_LIST_TYPE = new TypeReference<>() {};

    private final BlockJpaRepository blockRepository;
    private final PendingTransactionJpaRepository pendingRepository;
    private final ObjectMapper objectMapper;

    public JpaBlockchainStateStore(
            BlockJpaRepository blockRepository,
            PendingTransactionJpaRepository pendingRepository,
            ObjectMapper objectMapper
    ) {
        this.blockRepository = blockRepository;
        this.pendingRepository = pendingRepository;
        this.objectMapper = objectMapper;
    }

    @Override
    @Transactional(readOnly = true)
    public BlockchainSnapshot load() {
        BlockchainSnapshot snapshot = new BlockchainSnapshot();
        snapshot.setBlocks(blockRepository.findAllByOrderByBlockIndexAsc().stream()
                .map(this::toBlock)
                .toList());
        snapshot.setPendingPool(pendingRepository.findAllByOrderByCreatedAtAsc().stream()
                .map(this::toPending)
                .toList());
        return snapshot;
    }

    @Override
    @Transactional
    public void saveBlocks(List<Block> blocks) {
        blockRepository.deleteAllInBatch();
        if (blocks != null && !blocks.isEmpty()) {
            blockRepository.saveAll(blocks.stream().map(this::toBlockEntity).toList());
        }
    }

    @Override
    @Transactional
    public void savePendingPool(List<PendingTransaction> pendingPool) {
        pendingRepository.deleteAllInBatch();
        if (pendingPool != null && !pendingPool.isEmpty()) {
            pendingRepository.saveAll(pendingPool.stream().map(this::toPendingEntity).toList());
        }
    }

    @Override
    @Transactional
    public void saveAll(List<Block> blocks, List<PendingTransaction> pendingPool) {
        saveBlocks(blocks);
        savePendingPool(pendingPool);
    }

    private Block toBlock(BlockEntity entity) {
        Block block = new Block();
        block.setIndex(entity.getBlockIndex());
        block.setTimestamp(entity.getBlockTimestamp());
        block.setData(entity.getBlockData());
        block.setPreviousHash(entity.getPreviousHash());
        block.setHash(entity.getBlockHash());
        block.setNonce(entity.getNonce());
        block.setDifficulty(entity.getDifficulty());
        block.setTransactions(readTransactions(entity.getTransactionsJson()));
        return block;
    }

    private BlockEntity toBlockEntity(Block block) {
        BlockEntity entity = new BlockEntity();
        entity.setBlockIndex(block.getIndex());
        entity.setBlockTimestamp(block.getTimestamp());
        entity.setBlockData(block.getData());
        entity.setPreviousHash(block.getPreviousHash());
        entity.setBlockHash(block.getHash());
        entity.setNonce(block.getNonce());
        entity.setDifficulty(block.getDifficulty());
        entity.setTransactionsJson(writeTransactions(block.getTransactions()));
        return entity;
    }

    private PendingTransaction toPending(PendingTransactionEntity entity) {
        PendingTransaction pending = new PendingTransaction();
        pending.setId(entity.getId());
        pending.setHash(entity.getTxHash());
        pending.setFromAddress(entity.getFromAddress());
        pending.setToAddress(entity.getToAddress());
        pending.setAmount(entity.getAmount());
        pending.setData(entity.getTxData());
        pending.setSignature(entity.getSignature());
        pending.setStatus(entity.getStatus());
        pending.setSystemReward(entity.isSystemReward());
        pending.setCreatedAt(entity.getCreatedAt());
        return pending;
    }

    private PendingTransactionEntity toPendingEntity(PendingTransaction pending) {
        PendingTransactionEntity entity = new PendingTransactionEntity();
        entity.setId(pending.getId());
        entity.setTxHash(pending.getHash());
        entity.setFromAddress(pending.getFromAddress());
        entity.setToAddress(pending.getToAddress());
        entity.setAmount(pending.getAmount() != null ? pending.getAmount() : BigDecimal.ZERO);
        entity.setTxData(pending.getData());
        entity.setSignature(pending.getSignature());
        entity.setStatus(pending.getStatus());
        entity.setSystemReward(Boolean.TRUE.equals(pending.getSystemReward()));
        entity.setCreatedAt(pending.getCreatedAt() != null ? pending.getCreatedAt() : 0L);
        return entity;
    }

    private List<Transaction> readTransactions(String json) {
        if (json == null || json.isBlank()) {
            return new ArrayList<>();
        }
        try {
            return objectMapper.readValue(json, TX_LIST_TYPE);
        } catch (Exception exception) {
            return new ArrayList<>();
        }
    }

    private String writeTransactions(List<Transaction> transactions) {
        try {
            return objectMapper.writeValueAsString(transactions != null ? transactions : List.of());
        } catch (Exception exception) {
            return "[]";
        }
    }
}
