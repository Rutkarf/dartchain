package io.dartchain.backend.m4t3r.store;

import io.dartchain.backend.m4t3r.model.M4t3rReward;

import java.util.List;
import java.util.Optional;

public interface M4t3rRewardStore {

    M4t3rReward save(M4t3rReward reward);

    Optional<M4t3rReward> findByCollectionId(String collectionId);

    Optional<M4t3rReward> findByRewardId(String rewardId);

    List<M4t3rReward> findByWalletOrderByCollectedAtDesc(String walletAddress, int limit, int offset);

    int countByWallet(String walletAddress);
}
