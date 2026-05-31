package io.dartchain.backend.peer;

public class PeerConnection {

    private final String url;
    private PeerStatus status;
    private String message;

    public PeerConnection(String url, PeerStatus status, String message) {
        this.url = url;
        this.status = status;
        this.message = message;
    }

    public String getUrl() {
        return url;
    }

    public PeerStatus getStatus() {
        return status;
    }

    public String getMessage() {
        return message;
    }

    public void setStatus(PeerStatus status) {
        this.status = status;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}