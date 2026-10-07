package io.dartchain.backend.blockchain.application;

import io.dartchain.backend.blockchain.BlockchainSnapshot;
import io.dartchain.backend.blockchain.dto.BlockValidationResult;
import io.dartchain.backend.blockchain.model.Block;
import io.dartchain.backend.blockchain.model.PendingTransaction;
import io.dartchain.backend.blockchain.model.Transaction;
import io.dartchain.backend.blockchain.store.BlockchainStateStore;
import io.dartchain.backend.ops.ApplicationMetricsCollector;
import io.dartchain.backend.showcase.application.MarketChartService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class BlockchainServiceMiningRewardTest {

    private InMemoryStore store;
    private TransactionPoolService pool;
    private BlockchainService blockchain;

    @BeforeEach
    void setUp() {
        store = new InMemoryStore();
        pool = new TransactionPoolService(store);
        pool.loadFromStore();

        BlockchainValidationService validation = mock(BlockchainValidationService.class);
        when(validation.validateBlockAgainstChain(any(), any()))
                .thenReturn(new BlockValidationResult(true, "ok"));

        blockchain = new BlockchainService(
                store,
                validation,
                mock(MarketChartService.class),
                pool,
                mock(ApplicationMetricsCollector.class)
        );
        blockchain.loadFromStore();
    }

    @Test
    void miningUserTransactionPaysMiningReward() {
        pool.add(userPending("user-tx", "alice", "bob", "1.0"));

        Block block = blockchain.minePendingTransactions("miner-1");

        assertThat(block.getTransactions())
                .anyMatch(tx -> "MINING_REWARD".equals(tx.getPayload())
                        && tx.getAmount().compareTo(new BigDecimal("10.0")) == 0
                        && "miner-1".equals(tx.getRecipient()));
        assertThat(blockchain.getBalance("miner-1")).isEqualByComparingTo("10.0");
    }

    @Test
    void miningSystemCreditAloneDoesNotPayMiningReward() {
        pool.add(systemPending("faucet-tx", "wallet-1", "0.00000000000000000000000001"));

        Block block = blockchain.minePendingTransactions("wallet-1");

        assertThat(block.getTransactions())
                .noneMatch(tx -> "MINING_REWARD".equals(tx.getPayload()));
        assertThat(blockchain.getBalance("wallet-1"))
                .isEqualByComparingTo("0.00000000000000000000000001");
    }

    @Test
    void miningEmptyPoolIsRejected() {
        assertThatThrownBy(() -> blockchain.minePendingTransactions("miner-1"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Aucune transaction");
    }

    @Test
    void mintSystemCreditCreditsExactAmount() {
        Transaction credit = blockchain.mintSystemCredit(
                "wallet-2",
                new BigDecimal("1.00"),
                "QUEST_TASK:daily-login"
        );

        assertThat(credit.getAmount()).isEqualByComparingTo("1.00");
        assertThat(blockchain.getBalance("wallet-2")).isEqualByComparingTo("1.00");
        assertThat(blockchain.getLatestBlock().getTransactions())
                .noneMatch(tx -> "MINING_REWARD".equals(tx.getPayload()));
    }

    private static PendingTransaction userPending(String id, String from, String to, String amount) {
        PendingTransaction tx = new PendingTransaction();
        tx.setId(id);
        tx.setHash("hash-" + id);
        tx.setFromAddress(from);
        tx.setToAddress(to);
        tx.setAmount(new BigDecimal(amount));
        tx.setStatus("PENDING");
        tx.setCreatedAt(1L);
        tx.setSystemReward(false);
        tx.setSignature("sig");
        return tx;
    }

    private static PendingTransaction systemPending(String id, String to, String amount) {
        PendingTransaction tx = new PendingTransaction();
        tx.setId(id);
        tx.setHash("hash-" + id);
        tx.setFromAddress("SYSTEM");
        tx.setToAddress(to);
        tx.setAmount(new BigDecimal(amount));
        tx.setStatus("PENDING");
        tx.setCreatedAt(1L);
        tx.setSystemReward(true);
        tx.setData("FAUCET_CLAIM");
        tx.setSignature("SYSTEM");
        return tx;
    }

    private static final class InMemoryStore implements BlockchainStateStore {
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
        }

        @Override
        public void saveAll(List<Block> blocks, List<PendingTransaction> pendingPool) {
            saveBlocks(blocks);
            savePendingPool(pendingPool);
        }
    }
}
