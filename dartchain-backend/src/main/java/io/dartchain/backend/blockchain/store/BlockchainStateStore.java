package io.dartchain.backend.blockchain.store;

import io.dartchain.backend.blockchain.BlockchainSnapshot;
import io.dartchain.backend.blockchain.model.Block;
import io.dartchain.backend.blockchain.model.PendingTransaction;

import java.util.List;

public interface BlockchainStateStore {

    BlockchainSnapshot load();

    void saveBlocks(List<Block> blocks);

    void savePendingPool(List<PendingTransaction> pendingPool);

    void saveAll(List<Block> blocks, List<PendingTransaction> pendingPool);
}
