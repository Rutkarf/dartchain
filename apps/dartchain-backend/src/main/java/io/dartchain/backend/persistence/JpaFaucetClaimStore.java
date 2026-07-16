package io.dartchain.backend.persistence;

import io.dartchain.backend.faucet.store.FaucetClaimStore;
import io.dartchain.backend.model.FaucetClaim;
import io.dartchain.backend.persistence.entity.FaucetClaimEntity;
import io.dartchain.backend.persistence.repository.FaucetClaimJpaRepository;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Component
@ConditionalOnProperty(name = "dartchain.persistence.mode", havingValue = "postgres")
public class JpaFaucetClaimStore implements FaucetClaimStore {

    private final FaucetClaimJpaRepository repository;

    public JpaFaucetClaimStore(FaucetClaimJpaRepository repository) {
        this.repository = repository;
    }

    @Override
    @Transactional
    public FaucetClaim save(FaucetClaim claim) {
        FaucetClaimEntity entity = toEntity(claim);
        if (entity.getCreatedAt() == null) {
            entity.setCreatedAt(Instant.now());
        }

        FaucetClaimEntity saved = repository.save(entity);
        return toModel(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<FaucetClaim> findLastClaimByWallet(String walletAddress) {
        if (walletAddress == null || walletAddress.isBlank()) {
            return Optional.empty();
        }

        return repository.findFirstByWalletAddressIgnoreCaseOrderByClaimedAtDesc(walletAddress)
                .map(this::toModel);
    }

    @Override
    @Transactional(readOnly = true)
    public List<FaucetClaim> findAllOrderByClaimedAtDesc() {
        return repository.findAllByOrderByClaimedAtDesc().stream()
                .map(this::toModel)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<FaucetClaim> findAllByWalletOrderByClaimedAtDesc(String walletAddress) {
        if (walletAddress == null || walletAddress.isBlank()) {
            return List.of();
        }

        return repository.findAllByWalletAddressIgnoreCaseOrderByClaimedAtDesc(walletAddress).stream()
                .map(this::toModel)
                .toList();
    }

    private FaucetClaimEntity toEntity(FaucetClaim claim) {
        FaucetClaimEntity entity = new FaucetClaimEntity();
        entity.setId(claim.getId());
        entity.setWalletAddress(claim.getWalletAddress());
        entity.setAmount(claim.getAmount());
        entity.setClaimedAt(claim.getClaimedAt());
        entity.setNextEligibleAt(claim.getNextEligibleAt());
        entity.setTxHash(claim.getTxHash());
        entity.setClientId(claim.getClientId());
        entity.setCreatedAt(Instant.ofEpochMilli(claim.getClaimedAt()));
        return entity;
    }

    private FaucetClaim toModel(FaucetClaimEntity entity) {
        FaucetClaim claim = new FaucetClaim();
        claim.setId(entity.getId());
        claim.setWalletAddress(entity.getWalletAddress());
        claim.setAmount(entity.getAmount());
        claim.setClaimedAt(entity.getClaimedAt());
        claim.setNextEligibleAt(entity.getNextEligibleAt());
        claim.setTxHash(entity.getTxHash());
        claim.setClientId(entity.getClientId());
        return claim;
    }
}
