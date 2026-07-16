package io.dartchain.backend.dto;

import java.util.List;

public class PeerView {

    private String url;
    private String status;
    private String message;
    private Long latencyMs;
    private Integer chainHeight;
    private Integer localChainHeight;
    private Integer syncPercent;
    private String lastSyncAt;
    private List<Integer> activityPoints;

    public PeerView() {
    }

    public PeerView(String url, String status, String message) {
        this.url = url;
        this.status = status;
        this.message = message;
    }

    public String getUrl() {
        return url;
    }

    public String getStatus() {
        return status;
    }

    public String getMessage() {
        return message;
    }

    public Long getLatencyMs() {
        return latencyMs;
    }

    public Integer getChainHeight() {
        return chainHeight;
    }

    public Integer getLocalChainHeight() {
        return localChainHeight;
    }

    public Integer getSyncPercent() {
        return syncPercent;
    }

    public String getLastSyncAt() {
        return lastSyncAt;
    }

    public List<Integer> getActivityPoints() {
        return activityPoints;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public void setLatencyMs(Long latencyMs) {
        this.latencyMs = latencyMs;
    }

    public void setChainHeight(Integer chainHeight) {
        this.chainHeight = chainHeight;
    }

    public void setLocalChainHeight(Integer localChainHeight) {
        this.localChainHeight = localChainHeight;
    }

    public void setSyncPercent(Integer syncPercent) {
        this.syncPercent = syncPercent;
    }

    public void setLastSyncAt(String lastSyncAt) {
        this.lastSyncAt = lastSyncAt;
    }

    public void setActivityPoints(List<Integer> activityPoints) {
        this.activityPoints = activityPoints;
    }
}
