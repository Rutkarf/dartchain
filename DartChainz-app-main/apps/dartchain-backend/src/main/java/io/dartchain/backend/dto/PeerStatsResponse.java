package io.dartchain.backend.dto;

public class PeerStatsResponse {

    private int active;
    private int total;

    public PeerStatsResponse() {
    }

    public PeerStatsResponse(int active, int total) {
        this.active = active;
        this.total = total;
    }

    public int getActive() {
        return active;
    }

    public void setActive(int active) {
        this.active = active;
    }

    public int getTotal() {
        return total;
    }

    public void setTotal(int total) {
        this.total = total;
    }
}
