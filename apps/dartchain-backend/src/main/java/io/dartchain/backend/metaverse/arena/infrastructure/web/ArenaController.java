package io.dartchain.backend.metaverse.arena.infrastructure.web;

import io.dartchain.backend.auth.application.AuthService;
import io.dartchain.backend.auth.model.UserAccount;
import io.dartchain.backend.metaverse.arena.application.InGameRewardsService;
import io.dartchain.backend.metaverse.arena.dto.ArenaEliminationRequest;
import io.dartchain.backend.metaverse.arena.dto.ArenaEliminationResponse;
import io.dartchain.backend.metaverse.arena.dto.ArenaJoinRequest;
import io.dartchain.backend.metaverse.arena.dto.ArenaPlayerStateResponse;
import io.dartchain.backend.metaverse.arena.model.ArenaPlayerState;
import io.dartchain.backend.metaverse.arena.store.InMemoryArenaLedgerStore;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.Comparator;
import java.util.List;

@RestController
@RequestMapping("/api/metaverse/arena")
public class ArenaController {

    private final AuthService authService;
    private final InGameRewardsService rewardsService;
    private final InMemoryArenaLedgerStore ledgerStore;

    public ArenaController(
            AuthService authService,
            InGameRewardsService rewardsService,
            InMemoryArenaLedgerStore ledgerStore
    ) {
        this.authService = authService;
        this.rewardsService = rewardsService;
        this.ledgerStore = ledgerStore;
    }

    @PostMapping("/session/join")
    public ArenaPlayerStateResponse join(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @Valid @RequestBody ArenaJoinRequest request
    ) {
        UserAccount account = authService.requireAuthenticatedAccount(authorization);
        ArenaPlayerState state = rewardsService.joinOrRefresh(
                account,
                request.displayName(),
                request.pendingDisplayMirror()
        );
        return toResponse(state);
    }

    @PostMapping("/session/leave")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void leave(
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        UserAccount account = authService.requireAuthenticatedAccount(authorization);
        ledgerStore.find(account.getId()).ifPresent(state -> {
            state.setStatus("disconnected");
            ledgerStore.save(state);
        });
    }

    @GetMapping("/state")
    public ArenaPlayerStateResponse state(
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        UserAccount account = authService.requireAuthenticatedAccount(authorization);
        ArenaPlayerState state = ledgerStore.find(account.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Not in arena"));
        return toResponse(state);
    }

    @PostMapping("/events/elimination")
    public ArenaEliminationResponse elimination(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @Valid @RequestBody ArenaEliminationRequest request
    ) {
        UserAccount account = authService.requireAuthenticatedAccount(authorization);
        return rewardsService.applyElimination(account, request);
    }

    @GetMapping("/leaderboard")
    public List<ArenaPlayerStateResponse> leaderboard() {
        return ledgerStore.findAll().stream()
                .sorted(Comparator.comparingInt(ArenaPlayerState::getKills).reversed())
                .limit(20)
                .map(this::toResponse)
                .toList();
    }

    private ArenaPlayerStateResponse toResponse(ArenaPlayerState state) {
        return new ArenaPlayerStateResponse(
                state.getUserId(),
                state.getDisplayName(),
                state.getStatus(),
                state.getFaucetBalance(),
                state.getProtectedBalance(),
                state.getPendingDisplayMirror(),
                state.getKills(),
                state.getDeaths(),
                state.getSpawnShieldUntil() == null ? null : state.getSpawnShieldUntil().toString()
        );
    }
}
