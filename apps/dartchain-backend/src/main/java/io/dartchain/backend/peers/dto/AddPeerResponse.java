package io.dartchain.backend.peers.dto;

public class AddPeerResponse {

    private boolean ok;
    private String peer;
    private String status;
    private String message;

    public AddPeerResponse() {
    }

    public AddPeerResponse(boolean ok, String peer, String status, String message) {
        this.ok = ok;
        this.peer = peer;
        this.status = status;
        this.message = message;
    }

    public boolean isOk() {
        return ok;
    }

    public String getPeer() {
        return peer;
    }

    public String getStatus() {
        return status;
    }

    public String getMessage() {
        return message;
    }

    public void setOk(boolean ok) {
        this.ok = ok;
    }

    public void setPeer(String peer) {
        this.peer = peer;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}