package io.dartchain.backend.m4t3r;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.dartchain.backend.m4t3r.config.M4t3rRewardConfig;
import io.dartchain.backend.m4t3r.model.M4t3rReward;
import io.dartchain.backend.m4t3r.store.M4t3rRewardStore;
import jakarta.annotation.PostConstruct;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

@Component
@ConditionalOnMissingBean(M4t3rRewardStore.class)
public class JsonM4t3rRewardStore implements M4t3rRewardStore {

    private final ObjectMapper objectMapper;
    private final Path storePath;
    private final List<M4t3rReward> rewards = new ArrayList<>();

    public JsonM4t3rRewardStore(ObjectMapper objectMapper, M4t3rRewardConfig config) {
        this.objectMapper = objectMapper;
        this.storePath = Path.of(config.getRewardsStorePath());
    }

    @PostConstruct
    public void loadFromDisk() {
        if (!Files.exists(storePath)) {
            return;
        }
        try {
            RewardSnapshot snapshot = objectMapper.readValue(Files.readString(storePath), RewardSnapshot.class);
            synchronized (rewards) {
                rewards.clear();
                if (snapshot.rewards() != null) {
                    rewards.addAll(snapshot.rewards());
                }
            }
        } catch (IOException exception) {
            throw new IllegalStateException("Unable to load m4t3r rewards from " + storePath, exception);
        }
    }

    @Override
    public synchronized M4t3rReward save(M4t3rReward reward) {
        rewards.removeIf(existing -> existing.getCollectionId().equals(reward.getCollectionId()));
        rewards.add(clone(reward));
        persist();
        return clone(reward);
    }

    @Override
    public synchronized Optional<M4t3rReward> findByCollectionId(String collectionId) {
        return rewards.stream()
                .filter(reward -> collectionId.equals(reward.getCollectionId()))
                .findFirst()
                .map(this::clone);
    }

    @Override
    public synchronized Optional<M4t3rReward> findByRewardId(String rewardId) {
        return rewards.stream()
                .filter(reward -> rewardId.equals(reward.getRewardId()))
                .findFirst()
                .map(this::clone);
    }

    @Override
    public synchronized List<M4t3rReward> findByWalletOrderByCollectedAtDesc(
            String walletAddress,
            int limit,
            int offset
    ) {
        if (walletAddress == null || walletAddress.isBlank()) {
            return List.of();
        }
        return rewards.stream()
                .filter(reward -> walletAddress.equalsIgnoreCase(reward.getWalletAddress()))
                .sorted(Comparator.comparingLong(M4t3rReward::getCollectedAt).reversed())
                .skip(Math.max(0, offset))
                .limit(Math.max(1, limit))
                .map(this::clone)
                .toList();
    }

    @Override
    public synchronized int countByWallet(String walletAddress) {
        if (walletAddress == null || walletAddress.isBlank()) {
            return 0;
        }
        return (int) rewards.stream()
                .filter(reward -> walletAddress.equalsIgnoreCase(reward.getWalletAddress()))
                .count();
    }

    private void persist() {
        try {
            Files.createDirectories(storePath.getParent());
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(
                    storePath.toFile(),
                    new RewardSnapshot(List.copyOf(rewards))
            );
        } catch (IOException exception) {
            throw new IllegalStateException("Unable to persist m4t3r rewards to " + storePath, exception);
        }
    }

    private M4t3rReward clone(M4t3rReward source) {
        M4t3rReward copy = new M4t3rReward();
        copy.setRewardId(source.getRewardId());
        copy.setCollectionId(source.getCollectionId());
        copy.setUserId(source.getUserId());
        copy.setUserIdHash(source.getUserIdHash());
        copy.setWalletAddress(source.getWalletAddress());
        copy.setTokenId(source.getTokenId());
        copy.setChunkId(source.getChunkId());
        copy.setAmount(source.getAmount());
        copy.setPlayerSpeed(source.getPlayerSpeed());
        copy.setMaxAllowedSpeed(source.getMaxAllowedSpeed());
        copy.setCollectedAt(source.getCollectedAt());
        copy.setServerValidatedAt(source.getServerValidatedAt());
        copy.setProofHash(source.getProofHash());
        copy.setServerSignature(source.getServerSignature());
        copy.setSignatureAlgorithm(source.getSignatureAlgorithm());
        copy.setKeyId(source.getKeyId());
        copy.setStatus(source.getStatus());
        copy.setTransactionId(source.getTransactionId());
        copy.setChainId(source.getChainId());
        copy.setRejectionReason(source.getRejectionReason());
        copy.setNonce(source.getNonce());
        return copy;
    }

    private record RewardSnapshot(List<M4t3rReward> rewards) {
    }
}
