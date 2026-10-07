package io.dartchain.backend.blockchain;

import io.dartchain.backend.blockchain.model.Block;
import io.dartchain.backend.blockchain.model.PendingTransaction;

import java.util.ArrayList;
import java.util.List;

public class BlockchainSnapshot {

    private List<Block> blocks = new ArrayList<>();
    private List<PendingTransaction> pendingPool = new ArrayList<>();

    public BlockchainSnapshot() {
    }

    public List<Block> getBlocks() {
        return blocks;
    }

    public void setBlocks(List<Block> blocks) {
        this.blocks = blocks != null ? blocks : new ArrayList<>();
    }

    public List<PendingTransaction> getPendingPool() {
        return pendingPool;
    }

    public void setPendingPool(List<PendingTransaction> pendingPool) {
        this.pendingPool = pendingPool != null ? pendingPool : new ArrayList<>();
    }
}
