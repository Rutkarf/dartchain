package io.dartchain.backend.m4t3r;

import io.dartchain.backend.auth.AuthTokenResolver;
import io.dartchain.backend.m4t3r.dto.M4t3rHiddenCellsResponse;
import io.dartchain.backend.m4t3r.dto.M4t3rTrailPickupRequest;
import io.dartchain.backend.m4t3r.dto.M4t3rTrailPickupResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/m4t3r")
public class M4t3rTrailController {

    private final M4t3rTrailService trailService;
    private final AuthTokenResolver authTokenResolver;

    public M4t3rTrailController(M4t3rTrailService trailService, AuthTokenResolver authTokenResolver) {
        this.trailService = trailService;
        this.authTokenResolver = authTokenResolver;
    }

    @PostMapping("/trail-pickup")
    public M4t3rTrailPickupResponse pickup(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody M4t3rTrailPickupRequest request
    ) {
        String playerId = authTokenResolver.resolveAccount(authorization)
                .map(account -> account.getId())
                .orElseGet(() -> request.playerId() == null || request.playerId().isBlank()
                        ? "anonymous"
                        : request.playerId());
        return trailService.pickup(playerId, request);
    }

    @GetMapping("/trail-cells")
    public M4t3rHiddenCellsResponse hiddenCells() {
        return new M4t3rHiddenCellsResponse("M4T3R_TRAIL_CELLS_COLLECTED", trailService.hiddenCells());
    }
}
