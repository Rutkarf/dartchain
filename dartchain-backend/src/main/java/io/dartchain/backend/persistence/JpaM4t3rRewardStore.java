package io.dartchain.backend.persistence;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.dartchain.backend.m4t3r.model.M4t3rReward;
import io.dartchain.backend.m4t3r.store.M4t3rRewardStore;
import io.dartchain.backend.persistence.entity.M4t3rRewardEntity;
import io.dartchain.backend.persistence.repository.M4t3rRewardJpaRepository;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Component
@ConditionalOnProperty(name = "dartchain.persistence.mode", havingValue = "postgres")
public class JpaM4t3rRewardStore implements M4t3rRewardStore {

    private final M4t3rRewardJpaRepository repository;
    private final ObjectMapper objectMapper;

    public JpaM4t3rRewardStore(M4t3rRewardJpaRepository repository, ObjectMapper objectMapper) {
        this.repository = repository;
        this.objectMapper = objectMapper;
    }

    @Override
    @Transactional
    public M4t3rReward save(M4t3rReward reward) {
        if (reward.getCollectionId() != null) {
            repository.deleteByCollectionId(reward.getCollectionId());
            repository.flush();
        }
        repository.save(toEntity(reward));
        return reward;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<M4t3rReward> findByCollectionId(String collectionId) {
        return repository.findByCollectionId(collectionId).map(entity -> read(entity.getPayload()));
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<M4t3rReward> findByRewardId(String rewardId) {
        return repository.findById(rewardId).map(entity -> read(entity.getPayload()));
    }

    @Override
    @Transactional(readOnly = true)
    public List<M4t3rReward> findByWalletOrderByCollectedAtDesc(String walletAddress, int limit, int offset) {
        if (walletAddress == null || walletAddress.isBlank()) {
            return List.of();
        }
        return repository.findByWalletAddressIgnoreCaseOrderByCollectedAtDesc(walletAddress).stream()
                .skip(Math.max(0, offset))
                .limit(Math.max(1, limit))
                .map(entity -> read(entity.getPayload()))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public int countByWallet(String walletAddress) {
        if (walletAddress == null || walletAddress.isBlank()) {
            return 0;
        }
        return (int) repository.countByWalletAddressIgnoreCase(walletAddress);
    }

    private M4t3rRewardEntity toEntity(M4t3rReward reward) {
        M4t3rRewardEntity entity = new M4t3rRewardEntity();
        entity.setRewardId(reward.getRewardId());
        entity.setCollectionId(reward.getCollectionId());
        entity.setWalletAddress(reward.getWalletAddress());
        entity.setCollectedAt(reward.getCollectedAt());
        try {
            entity.setPayload(objectMapper.writeValueAsString(reward));
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Unable to persist m4t3r reward", exception);
        }
        return entity;
    }

    private M4t3rReward read(String payload) {
        try {
            return objectMapper.readValue(payload, M4t3rReward.class);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Unable to read m4t3r reward", exception);
        }
    }
}
