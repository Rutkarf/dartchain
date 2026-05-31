package io.dartchain.backend.dto;

public class PeerView {

    private String url;
    private String status;
    private String message;

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

    public void setUrl(String url) {
        this.url = url;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}