package io.dartchain.backend.persistence.repository;

import io.dartchain.backend.persistence.entity.M4t3rRewardEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface M4t3rRewardJpaRepository extends JpaRepository<M4t3rRewardEntity, String> {

    Optional<M4t3rRewardEntity> findByCollectionId(String collectionId);

    List<M4t3rRewardEntity> findByWalletAddressIgnoreCaseOrderByCollectedAtDesc(String walletAddress);

    long countByWalletAddressIgnoreCase(String walletAddress);

    void deleteByCollectionId(String collectionId);
}
