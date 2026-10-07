package io.dartchain.backend.m4t3r.infrastructure.web;

import io.dartchain.backend.auth.application.AuthService;
import io.dartchain.backend.auth.model.UserAccount;
import io.dartchain.backend.m4t3r.config.M4t3rRewardConfig;
import io.dartchain.backend.m4t3r.dto.M4t3rRewardDto;
import io.dartchain.backend.m4t3r.dto.M4t3rRewardHistoryResponse;
import io.dartchain.backend.m4t3r.dto.M4t3rRewardVerifyResponse;
import io.dartchain.backend.m4t3r.model.M4t3rReward;
import io.dartchain.backend.m4t3r.store.M4t3rRewardStore;
import io.dartchain.backend.m4t3r.M4t3rProofService;
import io.dartchain.backend.m4t3r.application.M4t3rRewardService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/m4t3r/rewards")
public class M4t3rRewardController {

    private final M4t3rRewardStore rewardStore;
    private final M4t3rRewardService rewardService;
    private final M4t3rProofService proofService;
    private final M4t3rRewardConfig config;
    private final AuthService authService;

    public M4t3rRewardController(
            M4t3rRewardStore rewardStore,
            M4t3rRewardService rewardService,
            M4t3rProofService proofService,
            M4t3rRewardConfig config,
            AuthService authService
    ) {
        this.rewardStore = rewardStore;
        this.rewardService = rewardService;
        this.proofService = proofService;
        this.config = config;
        this.authService = authService;
    }

    @GetMapping("/history")
    public M4t3rRewardHistoryResponse history(
            @RequestHeader("Authorization") String authorization,
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(defaultValue = "0") int offset
    ) {
        UserAccount account = authService.requireAuthenticatedAccount(authorization);
        authService.ensureWalletOwnership(account, account.getWalletAddress());
        List<M4t3rReward> rewards = rewardStore.findByWalletOrderByCollectedAtDesc(
                account.getWalletAddress(),
                Math.min(limit, 50),
                offset
        );
        List<M4t3rRewardDto> items = rewards.stream()
                .map(reward -> M4t3rRewardDto.from(
                        reward.getRewardId(),
                        reward.getCollectionId(),
                        reward.getTokenId(),
                        reward.getAmount(),
                        reward.getPlayerSpeed(),
                        reward.getMaxAllowedSpeed(),
                        reward.getStatus(),
                        reward.getProofHash(),
                        reward.getServerSignature(),
                        reward.getTransactionId(),
                        reward.getCollectedAt()
                ))
                .toList();
        return new M4t3rRewardHistoryResponse(
                account.getWalletAddress(),
                rewardStore.countByWallet(account.getWalletAddress()),
                items
        );
    }

    @GetMapping("/{rewardId}/verify")
    public M4t3rRewardVerifyResponse verify(@PathVariable String rewardId) {
        return rewardStore.findByRewardId(rewardId)
                .map(reward -> new M4t3rRewardVerifyResponse(
                        reward.getRewardId(),
                        reward.getProofHash(),
                        reward.getServerSignature(),
                        proofService.verify(reward.getProofHash(), reward.getServerSignature()),
                        "HmacSHA256",
                        config.getSigningKeyId()
                ))
                .orElse(new M4t3rRewardVerifyResponse(rewardId, null, null, false, "HmacSHA256", config.getSigningKeyId()));
    }
}
