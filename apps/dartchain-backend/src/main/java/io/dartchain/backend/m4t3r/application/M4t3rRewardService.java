package io.dartchain.backend.m4t3r.application;

import io.dartchain.backend.auth.model.UserAccount;
import io.dartchain.backend.faucet.store.FaucetPendingBalanceStore;
import io.dartchain.backend.m4t3r.config.M4t3rRewardConfig;
import io.dartchain.backend.m4t3r.dto.M4t3rRewardDto;
import io.dartchain.backend.m4t3r.dto.M4t3rTrailPickupRequest;
import io.dartchain.backend.m4t3r.model.M4t3rReward;
import io.dartchain.backend.m4t3r.model.MovementValidation;
import io.dartchain.backend.m4t3r.settlement.RewardSettlementService;
import io.dartchain.backend.m4t3r.settlement.SettlementResult;
import io.dartchain.backend.m4t3r.store.M4t3rRewardStore;
import io.dartchain.backend.shared.utils.WalletValidator;
import io.dartchain.backend.m4t3r.M4t3rGridUtils;
import io.dartchain.backend.m4t3r.M4t3rProofService;
import io.dartchain.backend.m4t3r.M4t3rRewardValidationService;
import io.dartchain.backend.m4t3r.M4t3rTrailService;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class M4t3rRewardService {

    private final M4t3rRewardStore rewardStore;
    private final M4t3rProofService proofService;
    private final M4t3rRewardConfig config;
    private final RewardSettlementService settlementService;
    private final FaucetPendingBalanceStore pendingBalanceStore;
    private final M4t3rRewardValidationService validationService;

    public M4t3rRewardService(
            M4t3rRewardStore rewardStore,
            M4t3rProofService proofService,
            M4t3rRewardConfig config,
            RewardSettlementService settlementService,
            FaucetPendingBalanceStore pendingBalanceStore,
            M4t3rRewardValidationService validationService
    ) {
        this.rewardStore = rewardStore;
        this.proofService = proofService;
        this.config = config;
        this.settlementService = settlementService;
        this.pendingBalanceStore = pendingBalanceStore;
        this.validationService = validationService;
    }

    public List<M4t3rRewardDto> processRewards(
            UserAccount account,
            String playerId,
            M4t3rTrailPickupRequest request,
            List<String> collectedCells,
            BigDecimal measuredSpeed
    ) {
        if (collectedCells == null || collectedCells.isEmpty()) {
            return List.of();
        }

        String walletError = validationService.validateWallet(account);
        if (walletError != null) {
            return List.of();
        }

        String nonceError = validationService.validateNonce(playerId, request);
        if (nonceError != null) {
            return List.of();
        }

        MovementValidation movement = validationService.validateMovement(playerId, request);
        if (!movement.isValid()) {
            return List.of();
        }

        BigDecimal validatedSpeed = movement.getMeasuredSpeed();
        if (validatedSpeed.compareTo(config.getMaxSpeedMps()) > 0) {
            return List.of();
        }

        String wallet = WalletValidator.normalize(account.getWalletAddress());
        List<M4t3rRewardDto> issued = new ArrayList<>();
        long now = System.currentTimeMillis();
        String nonce = request.nonce() != null && !request.nonce().isBlank()
                ? request.nonce()
                : request.playerId() + ":" + request.timestamp();

        for (String cellId : collectedCells) {
            long cycle = now / M4t3rTrailService.RESPAWN_DELAY_MS;
            String tokenId = M4t3rGridUtils.tokenId(config.getWorldId(), cellId, cycle);
            String collectionId = account.getId() + ":" + tokenId + ":" + cycle;

            Optional<M4t3rReward> existing = rewardStore.findByCollectionId(collectionId);
            if (existing.isPresent()) {
                M4t3rReward prior = existing.get();
                issued.add(toDto(prior, "DUPLICATE"));
                continue;
            }

            M4t3rReward reward = buildReward(
                    account,
                    wallet,
                    tokenId,
                    collectionId,
                    cellId,
                    validatedSpeed,
                    request,
                    now,
                    nonce
            );

            SettlementResult settlement = settlementService.settle(reward);
            if (!settlement.success()) {
                reward.setStatus("REJECTED");
                reward.setRejectionReason(settlement.failureReason());
                rewardStore.save(reward);
                continue;
            }
            reward.setStatus(settlement.status());
            if (settlement.transactionId() != null) {
                reward.setTransactionId(settlement.transactionId());
            }
            if (settlement.chainId() != null) {
                reward.setChainId(settlement.chainId());
            }
            rewardStore.save(reward);
            issued.add(toDto(reward, reward.getStatus()));
        }
        return issued;
    }

    public Optional<M4t3rRewardDto> verify(String rewardId) {
        return rewardStore.findByRewardId(rewardId).map(reward -> toDto(reward, reward.getStatus()));
    }

    public boolean isSignatureValid(String rewardId) {
        return rewardStore.findByRewardId(rewardId)
                .map(reward -> proofService.verify(reward.getProofHash(), reward.getServerSignature()))
                .orElse(false);
    }

    public String balanceAfter(UserAccount account) {
        if (account == null || account.getWalletAddress() == null || account.getWalletAddress().isBlank()) {
            return "0";
        }
        return pendingBalanceStore
                .get(WalletValidator.normalize(account.getWalletAddress()))
                .toPlainString();
    }

    private M4t3rReward buildReward(
            UserAccount account,
            String wallet,
            String tokenId,
            String collectionId,
            String cellId,
            BigDecimal validatedSpeed,
            M4t3rTrailPickupRequest request,
            long now,
            String nonce
    ) {
        M4t3rReward reward = new M4t3rReward();
        reward.setRewardId(UUID.randomUUID().toString());
        reward.setCollectionId(collectionId);
        reward.setUserId(account.getId());
        reward.setUserIdHash(proofService.hashUserId(account.getId()));
        reward.setWalletAddress(wallet);
        reward.setTokenId(tokenId);
        int[] grid = M4t3rGridUtils.parseClusterGrid(cellId);
        reward.setChunkId(grid == null ? "chunk:unknown" : M4t3rGridUtils.chunkIdFromGrid(grid[0], grid[1]));
        reward.setAmount(config.getAmountPerToken());
        reward.setPlayerSpeed(validatedSpeed.setScale(3, RoundingMode.HALF_UP));
        reward.setMaxAllowedSpeed(config.getMaxSpeedMps());
        reward.setCollectedAt(request.timestamp() > 0 ? request.timestamp() : now);
        reward.setServerValidatedAt(now);
        reward.setNonce(nonce);
        reward.setChainId("offchain");
        reward.setSignatureAlgorithm("HmacSHA256");
        reward.setKeyId(config.getSigningKeyId());
        reward.setStatus("VALIDATED");
        reward.setProofHash(proofService.buildProofHash(reward));
        reward.setServerSignature(proofService.signProofHash(reward.getProofHash()));
        return reward;
    }

    private M4t3rRewardDto toDto(M4t3rReward reward, String statusOverride) {
        return M4t3rRewardDto.from(
                reward.getRewardId(),
                reward.getCollectionId(),
                reward.getTokenId(),
                reward.getAmount(),
                reward.getPlayerSpeed(),
                reward.getMaxAllowedSpeed(),
                statusOverride,
                reward.getProofHash(),
                reward.getServerSignature(),
                reward.getTransactionId(),
                reward.getCollectedAt()
        );
    }
}
