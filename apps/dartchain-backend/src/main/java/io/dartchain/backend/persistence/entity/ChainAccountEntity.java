package io.dartchain.backend.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "chain_accounts")
public class ChainAccountEntity {

    @Id
    @Column(length = 42)
    private String address;

    @Column(name = "address_scheme", nullable = false, length = 16)
    private String addressScheme;

    @Column(name = "public_key")
    private String publicKey;

    @Column(nullable = false)
    private long nonce;

    @Column(name = "created_at", nullable = false)
    private long createdAt;

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getAddressScheme() {
        return addressScheme;
    }

    public void setAddressScheme(String addressScheme) {
        this.addressScheme = addressScheme;
    }

    public String getPublicKey() {
        return publicKey;
    }

    public void setPublicKey(String publicKey) {
        this.publicKey = publicKey;
    }

    public long getNonce() {
        return nonce;
    }

    public void setNonce(long nonce) {
        this.nonce = nonce;
    }

    public long getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(long createdAt) {
        this.createdAt = createdAt;
    }
}
