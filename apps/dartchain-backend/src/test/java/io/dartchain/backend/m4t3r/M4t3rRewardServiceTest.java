package io.dartchain.backend.m4t3r;

import io.dartchain.backend.auth.UserAccount;
import io.dartchain.backend.m4t3r.config.M4t3rRewardConfig;
import io.dartchain.backend.m4t3r.dto.M4t3rRewardDto;
import io.dartchain.backend.m4t3r.dto.M4t3rTrailPickupRequest;
import io.dartchain.backend.m4t3r.dto.WorldPoint;
import io.dartchain.backend.m4t3r.model.M4t3rReward;
import io.dartchain.backend.m4t3r.settlement.OffChainSettlementService;
import io.dartchain.backend.m4t3r.settlement.RewardSettlementService;
import io.dartchain.backend.m4t3r.settlement.SettlementResult;
import io.dartchain.backend.m4t3r.store.M4t3rRewardStore;
import io.dartchain.backend.service.BlockchainService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class M4t3rRewardServiceTest {

    private M4t3rRewardStore rewardStore;
    private M4t3rProofService proofService;
    private M4t3rRewardConfig config;
    private RewardSettlementService settlementService;
    private BlockchainService blockchainService;
    private M4t3rRewardValidationService validationService;
    private M4t3rRewardService rewardService;
    private UserAccount account;

    @BeforeEach
    void setUp() {
        rewardStore = new InMemoryRewardStore();
        config = new M4t3rRewardConfig();
        setField(config, "signingKey", "test-signing-key");
        setField(config, "signingKeyId", "test-key");
        setField(config, "amountPerToken", "0.00000000000000000000000001");
        setField(config, "maxSpeedMps", "5.0");
        setField(config, "worldId", "marseille");
        setField(config, "settlementMode", "OFFCHAIN");

        proofService = new M4t3rProofService(config);
        blockchainService = mock(BlockchainService.class);
        when(blockchainService.getBalance(any())).thenReturn(new BigDecimal("1"));

        settlementService = mock(RewardSettlementService.class);
        when(settlementService.settle(any())).thenAnswer(invocation -> {
            M4t3rReward reward = invocation.getArgument(0);
            return SettlementResult.creditedOffChain("tx-hash-1", "offchain", new BigDecimal("2"));
        });

        validationService = new M4t3rRewardValidationService(config, new M4t3rNonceStore());
        rewardService = new M4t3rRewardService(
                rewardStore,
                proofService,
                config,
                settlementService,
                blockchainService,
                validationService
        );

        account = new UserAccount();
        account.setId("user-1");
        account.setWalletAddress("R4V3testwallet");
    }

    @Test
    void issuesSignedRewardForValidCollect() {
        M4t3rTrailPickupRequest request = trailRequest("player-1", 1.0, 1.0, 1.4, 1.0);
        List<M4t3rRewardDto> rewards = rewardService.processRewards(
                account,
                "player-1",
                request,
                List.of("m4t3r-cluster:7:7"),
                new BigDecimal("1.200")
        );
        assertThat(rewards).hasSize(1);
        assertThat(rewards.get(0).status()).isEqualTo("CREDITED_OFFCHAIN");
        assertThat(rewards.get(0).proofHash()).startsWith("0x");
        assertThat(rewards.get(0).serverSignature()).startsWith("0x");
        assertThat(rewardService.isSignatureValid(rewards.get(0).rewardId())).isTrue();
    }

    @Test
    void rejectsWhenWalletNotLinked() {
        account.setWalletAddress(null);
        M4t3rTrailPickupRequest request = trailRequest("player-2", 1.0, 1.0, 1.4, 1.0);
        List<M4t3rRewardDto> rewards = rewardService.processRewards(
                account,
                "player-2",
                request,
                List.of("m4t3r-cluster:7:7"),
                new BigDecimal("1.000")
        );
        assertThat(rewards).isEmpty();
    }

    @Test
    void idempotentCollectionReturnsDuplicateStatus() {
        long ts = System.currentTimeMillis();
        List<String> cells = List.of("m4t3r-cluster:14:14");
        M4t3rTrailPickupRequest firstRequest = new M4t3rTrailPickupRequest(
                "M4T3R_TRAIL_PICKUP_REQUEST",
                "player-3",
                new WorldPoint(2.0, 0, 2.0),
                new WorldPoint(2.3, 0, 2.0),
                cells,
                ts,
                "1.000",
                "nonce-first"
        );
        M4t3rTrailPickupRequest secondRequest = new M4t3rTrailPickupRequest(
                "M4T3R_TRAIL_PICKUP_REQUEST",
                "player-3",
                new WorldPoint(2.0, 0, 2.0),
                new WorldPoint(2.3, 0, 2.0),
                cells,
                ts,
                "1.000",
                "nonce-second"
        );

        List<M4t3rRewardDto> first = rewardService.processRewards(
                account, "player-3", firstRequest, cells, new BigDecimal("1.000"));
        assertThat(first).hasSize(1);

        List<M4t3rRewardDto> second = rewardService.processRewards(
                account, "player-3", secondRequest, cells, new BigDecimal("1.000"));
        assertThat(second).hasSize(1);
        assertThat(second.get(0).status()).isEqualTo("DUPLICATE");
        assertThat(second.get(0).rewardId()).isEqualTo(first.get(0).rewardId());
    }

    @Test
    void rejectsReusedNonce() {
        M4t3rTrailPickupRequest request = new M4t3rTrailPickupRequest(
                "M4T3R_TRAIL_PICKUP_REQUEST",
                "player-4",
                new WorldPoint(3, 0, 3),
                new WorldPoint(3.3, 0, 3),
                List.of("m4t3r-cluster:21:21"),
                System.currentTimeMillis(),
                "1.000",
                "fixed-nonce-abc"
        );
        List<M4t3rRewardDto> first = rewardService.processRewards(
                account, "player-4", request, request.candidateCellIds(), new BigDecimal("1.000"));
        assertThat(first).hasSize(1);

        List<M4t3rRewardDto> second = rewardService.processRewards(
                account, "player-4", request, request.candidateCellIds(), new BigDecimal("1.000"));
        assertThat(second).isEmpty();
    }

    private static M4t3rTrailPickupRequest trailRequest(
            String playerId,
            double px, double pz,
            double cx, double cz
    ) {
        return new M4t3rTrailPickupRequest(
                "M4T3R_TRAIL_PICKUP_REQUEST",
                playerId,
                new WorldPoint(px, 0, pz),
                new WorldPoint(cx, 0, cz),
                List.of("m4t3r-cluster:" + (int) Math.floor(cx / 0.14) + ":" + (int) Math.floor(cz / 0.14)),
                System.currentTimeMillis(),
                "1.000",
                playerId + ":" + System.nanoTime()
        );
    }

    private static void setField(Object target, String fieldName, String value) {
        try {
            var field = target.getClass().getDeclaredField(fieldName);
            field.setAccessible(true);
            field.set(target, value);
        } catch (ReflectiveOperationException exception) {
            throw new IllegalStateException(exception);
        }
    }

    private static final class InMemoryRewardStore implements M4t3rRewardStore {
        private final List<M4t3rReward> rewards = new ArrayList<>();

        @Override
        public synchronized M4t3rReward save(M4t3rReward reward) {
            rewards.removeIf(r -> r.getCollectionId().equals(reward.getCollectionId()));
            rewards.add(reward);
            return reward;
        }

        @Override
        public Optional<M4t3rReward> findByCollectionId(String collectionId) {
            return rewards.stream().filter(r -> collectionId.equals(r.getCollectionId())).findFirst();
        }

        @Override
        public Optional<M4t3rReward> findByRewardId(String rewardId) {
            return rewards.stream().filter(r -> rewardId.equals(r.getRewardId())).findFirst();
        }

        @Override
        public List<M4t3rReward> findByWalletOrderByCollectedAtDesc(String walletAddress, int limit, int offset) {
            return List.of();
        }

        @Override
        public int countByWallet(String walletAddress) {
            return 0;
        }
    }
}
