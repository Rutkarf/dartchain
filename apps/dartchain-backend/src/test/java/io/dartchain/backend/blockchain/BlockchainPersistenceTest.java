package io.dartchain.backend.blockchain;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.dartchain.backend.blockchain.store.BlockchainStateStore;
import io.dartchain.backend.dto.BlockValidationResult;
import io.dartchain.backend.model.PendingTransaction;
import io.dartchain.backend.service.BlockchainService;
import io.dartchain.backend.service.BlockchainValidationService;
import io.dartchain.backend.service.TransactionPoolService;
import io.dartchain.backend.showcase.service.MarketChartService;
import io.dartchain.backend.support.BlockchainTestSupport;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.math.BigDecimal;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class BlockchainPersistenceTest {

    @TempDir
    Path tempDir;

    @Test
    void jsonStoreReloadsBlocksAndPendingPoolAfterRestart() {
        Path statePath = tempDir.resolve("blockchain-state.json");
        ObjectMapper objectMapper = new ObjectMapper();

        JsonBlockchainStateStore store = new JsonBlockchainStateStore(objectMapper, statePath.toString());
        store.loadFromDisk();

        BlockchainValidationService validationService = mock(BlockchainValidationService.class);
        MarketChartService marketChartService = mock(MarketChartService.class);
        when(validationService.validateBlockAgainstChain(any(), anyList()))
                .thenReturn(new BlockValidationResult(true, "ok"));

        TransactionPoolService pool = BlockchainTestSupport.newTransactionPool(store);
        BlockchainService blockchain = BlockchainTestSupport.newBlockchainService(
                store,
                validationService,
                marketChartService,
                pool
        );

        PendingTransaction pending = new PendingTransaction();
        pending.setId("persist-tx");
        pending.setHash("0123456789012345678901234567890123456789012345678901234567890");
        pending.setFromAddress("alice");
        pending.setToAddress("bob");
        pending.setAmount(new BigDecimal("2.5"));
        pending.setData("payload");
        pending.setSignature("SIGNED_BACKEND");
        pending.setStatus("PENDING");
        pending.setCreatedAt(System.currentTimeMillis());
        pending.setSystemReward(false);
        pool.add(pending);

        blockchain.minePendingTransactions("miner-wallet");

        assertThat(blockchain.getBlocks()).hasSizeGreaterThanOrEqualTo(2);
        assertThat(pool.getAll()).isEmpty();

        JsonBlockchainStateStore reloadedStore = new JsonBlockchainStateStore(objectMapper, statePath.toString());
        reloadedStore.loadFromDisk();

        TransactionPoolService reloadedPool = BlockchainTestSupport.newTransactionPool(reloadedStore);
        BlockchainService reloadedBlockchain = BlockchainTestSupport.newBlockchainService(
                reloadedStore,
                validationService,
                marketChartService,
                reloadedPool
        );

        assertThat(reloadedBlockchain.getBlocks()).hasSize(blockchain.getBlocks().size());
        assertThat(reloadedBlockchain.getLatestBlock().getIndex())
                .isEqualTo(blockchain.getLatestBlock().getIndex());
        assertThat(reloadedPool.getAll()).isEmpty();
    }
}
