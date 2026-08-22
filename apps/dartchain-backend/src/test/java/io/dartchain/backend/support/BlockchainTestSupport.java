package io.dartchain.backend.support;

import io.dartchain.backend.blockchain.InMemoryBlockchainStateStore;
import io.dartchain.backend.blockchain.store.BlockchainStateStore;
import io.dartchain.backend.ops.ApplicationMetricsCollector;
import io.dartchain.backend.blockchain.application.BlockchainService;
import io.dartchain.backend.blockchain.application.BlockchainValidationService;
import io.dartchain.backend.blockchain.application.TransactionPoolService;
import io.dartchain.backend.showcase.application.MarketChartService;

public final class BlockchainTestSupport {

    private BlockchainTestSupport() {
    }

    public static InMemoryBlockchainStateStore inMemoryStore() {
        return new InMemoryBlockchainStateStore();
    }

    public static TransactionPoolService newTransactionPool(BlockchainStateStore store) {
        TransactionPoolService service = new TransactionPoolService(store);
        service.loadFromStore();
        return service;
    }

    public static BlockchainService newBlockchainService(
            BlockchainStateStore store,
            BlockchainValidationService validationService,
            MarketChartService marketChartService,
            TransactionPoolService transactionPoolService
    ) {
        BlockchainService service = new BlockchainService(
                store,
                validationService,
                marketChartService,
                transactionPoolService,
                new ApplicationMetricsCollector()
        );
        service.loadFromStore();
        return service;
    }
}
