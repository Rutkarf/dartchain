package io.dartchain.backend.p2p;

public class P2pMessage {

    private P2pMessageType type;
    private String data;

    public P2pMessage() {
    }

    public P2pMessage(P2pMessageType type, String data) {
        this.type = type;
        this.data = data;
    }

    public P2pMessageType getType() {
        return type;
    }

    public void setType(P2pMessageType type) {
        this.type = type;
    }

    public String getData() {
        return data;
    }

    public void setData(String data) {
        this.data = data;
    }
}