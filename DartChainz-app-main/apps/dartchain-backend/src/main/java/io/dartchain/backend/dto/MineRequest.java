package io.dartchain.backend.dto;

public class MineRequest {

    private String minerAddress;

    public MineRequest() {
    }

    public String getMinerAddress() {
        return minerAddress;
    }

    public void setMinerAddress(String minerAddress) {
        this.minerAddress = minerAddress;
    }
}