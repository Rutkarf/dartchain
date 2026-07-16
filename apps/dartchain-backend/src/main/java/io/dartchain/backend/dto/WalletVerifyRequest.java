package io.dartchain.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class WalletVerifyRequest {

    @NotBlank(message = "address is required")
    @Size(min = 4, max = 256, message = "address must contain between 4 and 256 characters")
    private String address;

    @NotBlank(message = "publicKey is required")
    private String publicKey;

    public WalletVerifyRequest() {
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getPublicKey() {
        return publicKey;
    }

    public void setPublicKey(String publicKey) {
        this.publicKey = publicKey;
    }
}
