package io.dartchain.backend.blockchain.application;

import io.dartchain.backend.blockchain.BlockchainSnapshot;
import io.dartchain.backend.blockchain.dto.BlockValidationResult;
import io.dartchain.backend.blockchain.model.Block;
import io.dartchain.backend.blockchain.model.PendingTransaction;
import io.dartchain.backend.blockchain.store.BlockchainStateStore;
import io.dartchain.backend.ops.ApplicationMetricsCollector;
import io.dartchain.backend.shared.exception.InvalidBlockException;
import io.dartchain.backend.showcase.application.MarketChartService;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class BlockchainServiceMinePoolTest {

    @Test
    void rejectedBlockLeavesThePoolUntouched() {
        RecordingStore store = new RecordingStore();
        TransactionPoolService pool = new TransactionPoolService(store);
        pool.loadFromStore();
        pool.add(pending("a"));
        pool.add(pending("b"));

        BlockchainValidationService validation = mock(BlockchainValidationService.class);
        when(validation.validateBlockAgainstChain(any(), any()))
                .thenReturn(new BlockValidationResult(false, "refus"));

        BlockchainService blockchain = new BlockchainService(
                store,
                validation,
                mock(MarketChartService.class),
                pool,
                mock(ApplicationMetricsCollector.class)
        );
        blockchain.loadFromStore();

        assertThatThrownBy(() -> blockchain.minePendingTransactions("miner"))
                .isInstanceOf(InvalidBlockException.class);

        assertThat(pool.getAll()).extracting(PendingTransaction::getId).containsExactly("a", "b");
        assertThat(store.pendingSizes).doesNotContain(0);
    }

    private static PendingTransaction pending(String id) {
        PendingTransaction transaction = new PendingTransaction();
        transaction.setId(id);
        transaction.setFromAddress("from-" + id);
        transaction.setToAddress("to-" + id);
        transaction.setAmount(new BigDecimal("1"));
        transaction.setStatus("PENDING");
        transaction.setCreatedAt(1L);
        return transaction;
    }

    private static final class RecordingStore implements BlockchainStateStore {
        private final List<Integer> pendingSizes = new ArrayList<>();
        private List<PendingTransaction> pool = new ArrayList<>();
        private List<Block> blocks = new ArrayList<>();

        @Override
        public BlockchainSnapshot load() {
            BlockchainSnapshot snapshot = new BlockchainSnapshot();
            snapshot.setBlocks(blocks);
            snapshot.setPendingPool(pool);
            return snapshot;
        }

        @Override
        public void saveBlocks(List<Block> blocks) {
            this.blocks = new ArrayList<>(blocks);
        }

        @Override
        public void savePendingPool(List<PendingTransaction> pendingPool) {
            this.pool = new ArrayList<>(pendingPool);
            pendingSizes.add(pendingPool.size());
        }

        @Override
        public void saveAll(List<Block> blocks, List<PendingTransaction> pendingPool) {
            saveBlocks(blocks);
            savePendingPool(pendingPool);
        }
    }
}
