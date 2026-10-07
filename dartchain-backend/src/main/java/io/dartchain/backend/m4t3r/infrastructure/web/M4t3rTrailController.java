package io.dartchain.backend.m4t3r.infrastructure.web;

import io.dartchain.backend.auth.application.AuthTokenResolver;
import io.dartchain.backend.auth.model.UserAccount;
import io.dartchain.backend.m4t3r.config.M4t3rRewardConfig;
import io.dartchain.backend.m4t3r.dto.M4t3rHiddenCellsResponse;
import io.dartchain.backend.m4t3r.dto.M4t3rRewardDto;
import io.dartchain.backend.m4t3r.dto.M4t3rTrailPickupRequest;
import io.dartchain.backend.m4t3r.dto.M4t3rTrailPickupResponse;
import io.dartchain.backend.m4t3r.M4t3rTrailService;
import io.dartchain.backend.m4t3r.application.M4t3rRewardService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/m4t3r")
public class M4t3rTrailController {

    private final M4t3rTrailService trailService;
    private final M4t3rRewardService rewardService;
    private final AuthTokenResolver authTokenResolver;
    private final M4t3rRewardConfig rewardConfig;

    public M4t3rTrailController(
            M4t3rTrailService trailService,
            M4t3rRewardService rewardService,
            AuthTokenResolver authTokenResolver,
            M4t3rRewardConfig rewardConfig
    ) {
        this.trailService = trailService;
        this.rewardService = rewardService;
        this.authTokenResolver = authTokenResolver;
        this.rewardConfig = rewardConfig;
    }

    @PostMapping("/trail-pickup")
    public M4t3rTrailPickupResponse pickup(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody M4t3rTrailPickupRequest request
    ) {
        UserAccount account = authTokenResolver.resolveAccount(authorization).orElse(null);
        String playerId = account != null
                ? account.getId()
                : (request.playerId() == null || request.playerId().isBlank() ? "anonymous" : request.playerId());

        M4t3rTrailPickupResponse trailResponse = trailService.pickup(playerId, request);
        if (trailResponse.collectedCells().isEmpty() || account == null) {
            return trailResponse;
        }

        BigDecimal measuredSpeed = new BigDecimal(trailResponse.playerSpeed());
        List<M4t3rRewardDto> rewards = rewardService.processRewards(
                account,
                playerId,
                request,
                trailResponse.collectedCells(),
                measuredSpeed
        );
        String balanceAfter = rewardService.balanceAfter(account);

        return new M4t3rTrailPickupResponse(
                trailResponse.type(),
                playerId,
                trailResponse.collectedCells(),
                trailResponse.amount(),
                trailResponse.respawnAt(),
                balanceAfter,
                trailResponse.playerSpeed(),
                rewardConfig.getMaxSpeedMps().toPlainString(),
                rewardConfig.getSettlementMode(),
                rewards
        );
    }

    @GetMapping("/trail-cells")
    public M4t3rHiddenCellsResponse hiddenCells() {
        return new M4t3rHiddenCellsResponse("M4T3R_TRAIL_CELLS_COLLECTED", trailService.hiddenCells());
    }
}
