package io.dartchain.backend.persistence.repository;

import io.dartchain.backend.persistence.entity.WalletBalanceEntity;
import io.dartchain.backend.persistence.entity.WalletBalanceId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WalletBalanceJpaRepository extends JpaRepository<WalletBalanceEntity, WalletBalanceId> {

    List<WalletBalanceEntity> findByIdWalletAddress(String walletAddress);
}
