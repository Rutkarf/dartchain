package io.dartchain.backend.blockchain.dto;

public class StatsResponse {

    private int totalBlocks;
    private String latestHash;
    private long chainSize;

    public StatsResponse() {
    }

    public StatsResponse(int totalBlocks, String latestHash, long chainSize) {
        this.totalBlocks = totalBlocks;
        this.latestHash = latestHash;
        this.chainSize = chainSize;
    }

    public int getTotalBlocks() {
        return totalBlocks;
    }

    public void setTotalBlocks(int totalBlocks) {
        this.totalBlocks = totalBlocks;
    }

    public String getLatestHash() {
        return latestHash;
    }

    public void setLatestHash(String latestHash) {
        this.latestHash = latestHash;
    }

    public long getChainSize() {
        return chainSize;
    }

    public void setChainSize(long chainSize) {
        this.chainSize = chainSize;
    }
}