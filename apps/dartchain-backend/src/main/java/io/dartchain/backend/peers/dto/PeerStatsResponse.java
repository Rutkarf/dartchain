package io.dartchain.backend.peers.dto;

public class PeerStatsResponse {

    private int active;
    private int total;
    private Long avgLatencyMs;
    private Integer networkLoadPercent;

    public PeerStatsResponse() {
    }

    public PeerStatsResponse(int active, int total) {
        this.active = active;
        this.total = total;
    }

    public PeerStatsResponse(int active, int total, Long avgLatencyMs, Integer networkLoadPercent) {
        this.active = active;
        this.total = total;
        this.avgLatencyMs = avgLatencyMs;
        this.networkLoadPercent = networkLoadPercent;
    }

    public int getActive() {
        return active;
    }

    public int getTotal() {
        return total;
    }

    public Long getAvgLatencyMs() {
        return avgLatencyMs;
    }

    public Integer getNetworkLoadPercent() {
        return networkLoadPercent;
    }

    public void setActive(int active) {
        this.active = active;
    }

    public void setTotal(int total) {
        this.total = total;
    }

    public void setAvgLatencyMs(Long avgLatencyMs) {
        this.avgLatencyMs = avgLatencyMs;
    }

    public void setNetworkLoadPercent(Integer networkLoadPercent) {
        this.networkLoadPercent = networkLoadPercent;
    }
}
