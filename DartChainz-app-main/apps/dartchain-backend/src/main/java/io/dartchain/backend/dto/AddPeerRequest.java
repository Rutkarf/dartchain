package io.dartchain.backend.dto;

public class AddPeerRequest {

    private String peer;

    public AddPeerRequest() {
    }

    public String getPeer() {
        return peer;
    }

    public void setPeer(String peer) {
        this.peer = peer;
    }
}