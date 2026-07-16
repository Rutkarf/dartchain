package io.dartchain.backend.blockchain;

import io.dartchain.backend.blockchain.store.BlockchainStateStore;
import io.dartchain.backend.model.Block;
import io.dartchain.backend.model.PendingTransaction;

import java.util.ArrayList;
import java.util.List;

public class InMemoryBlockchainStateStore implements BlockchainStateStore {

    private List<Block> blocks = new ArrayList<>();
    private List<PendingTransaction> pendingPool = new ArrayList<>();

    @Override
    public synchronized BlockchainSnapshot load() {
        BlockchainSnapshot snapshot = new BlockchainSnapshot();
        snapshot.setBlocks(new ArrayList<>(blocks));
        snapshot.setPendingPool(new ArrayList<>(pendingPool));
        return snapshot;
    }

    @Override
    public synchronized void saveBlocks(List<Block> blocks) {
        this.blocks = blocks != null ? new ArrayList<>(blocks) : new ArrayList<>();
    }

    @Override
    public synchronized void savePendingPool(List<PendingTransaction> pendingPool) {
        this.pendingPool = pendingPool != null ? new ArrayList<>(pendingPool) : new ArrayList<>();
    }

    @Override
    public synchronized void saveAll(List<Block> blocks, List<PendingTransaction> pendingPool) {
        saveBlocks(blocks);
        savePendingPool(pendingPool);
    }
}
