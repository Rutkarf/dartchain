package io.dartchain.backend.m4t3r.model;

import java.math.BigDecimal;

public class M4t3rReward {

    private String rewardId;
    private String collectionId;
    private String userId;
    private String userIdHash;
    private String walletAddress;
    private String tokenId;
    private String chunkId;
    private BigDecimal amount;
    private BigDecimal playerSpeed;
    private BigDecimal maxAllowedSpeed;
    private long collectedAt;
    private long serverValidatedAt;
    private String proofHash;
    private String serverSignature;
    private String signatureAlgorithm;
    private String keyId;
    private String status;
    private String transactionId;
    private String chainId;
    private String rejectionReason;
    private String nonce;

    public String getRewardId() {
        return rewardId;
    }

    public void setRewardId(String rewardId) {
        this.rewardId = rewardId;
    }

    public String getCollectionId() {
        return collectionId;
    }

    public void setCollectionId(String collectionId) {
        this.collectionId = collectionId;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getUserIdHash() {
        return userIdHash;
    }

    public void setUserIdHash(String userIdHash) {
        this.userIdHash = userIdHash;
    }

    public String getWalletAddress() {
        return walletAddress;
    }

    public void setWalletAddress(String walletAddress) {
        this.walletAddress = walletAddress;
    }

    public String getTokenId() {
        return tokenId;
    }

    public void setTokenId(String tokenId) {
        this.tokenId = tokenId;
    }

    public String getChunkId() {
        return chunkId;
    }

    public void setChunkId(String chunkId) {
        this.chunkId = chunkId;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public BigDecimal getPlayerSpeed() {
        return playerSpeed;
    }

    public void setPlayerSpeed(BigDecimal playerSpeed) {
        this.playerSpeed = playerSpeed;
    }

    public BigDecimal getMaxAllowedSpeed() {
        return maxAllowedSpeed;
    }

    public void setMaxAllowedSpeed(BigDecimal maxAllowedSpeed) {
        this.maxAllowedSpeed = maxAllowedSpeed;
    }

    public long getCollectedAt() {
        return collectedAt;
    }

    public void setCollectedAt(long collectedAt) {
        this.collectedAt = collectedAt;
    }

    public long getServerValidatedAt() {
        return serverValidatedAt;
    }

    public void setServerValidatedAt(long serverValidatedAt) {
        this.serverValidatedAt = serverValidatedAt;
    }

    public String getProofHash() {
        return proofHash;
    }

    public void setProofHash(String proofHash) {
        this.proofHash = proofHash;
    }

    public String getServerSignature() {
        return serverSignature;
    }

    public void setServerSignature(String serverSignature) {
        this.serverSignature = serverSignature;
    }

    public String getSignatureAlgorithm() {
        return signatureAlgorithm;
    }

    public void setSignatureAlgorithm(String signatureAlgorithm) {
        this.signatureAlgorithm = signatureAlgorithm;
    }

    public String getKeyId() {
        return keyId;
    }

    public void setKeyId(String keyId) {
        this.keyId = keyId;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getTransactionId() {
        return transactionId;
    }

    public void setTransactionId(String transactionId) {
        this.transactionId = transactionId;
    }

    public String getChainId() {
        return chainId;
    }

    public void setChainId(String chainId) {
        this.chainId = chainId;
    }

    public String getRejectionReason() {
        return rejectionReason;
    }

    public void setRejectionReason(String rejectionReason) {
        this.rejectionReason = rejectionReason;
    }

    public String getNonce() {
        return nonce;
    }

    public void setNonce(String nonce) {
        this.nonce = nonce;
    }
}
