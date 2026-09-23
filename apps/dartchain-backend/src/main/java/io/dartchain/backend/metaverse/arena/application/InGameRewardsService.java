package io.dartchain.backend.metaverse.arena.application;

import io.dartchain.backend.auth.model.UserAccount;
import io.dartchain.backend.faucet.store.FaucetPendingBalanceStore;
import io.dartchain.backend.metaverse.arena.config.ArenaBalanceProperties;
import io.dartchain.backend.metaverse.arena.dto.ArenaEliminationRequest;
import io.dartchain.backend.metaverse.arena.dto.ArenaEliminationResponse;
import io.dartchain.backend.metaverse.arena.model.ArenaPlayerState;
import io.dartchain.backend.metaverse.arena.store.InMemoryArenaLedgerStore;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;

/**
 * Récompenses in-game — ledger arène uniquement.
 * Ne appelle jamais BlockchainService, claim faucet, ni smart contract.
 *
 * Q1=C : lit le pending faucet en miroir d'affichage au join ;
 * les transferts kill ne débitent PAS {@link FaucetPendingBalanceStore}.
 */
@Service
public class InGameRewardsService {

    private static final Logger log = LoggerFactory.getLogger(InGameRewardsService.class);

    private final InMemoryArenaLedgerStore ledgerStore;
    private final FaucetPendingBalanceStore pendingBalanceStore;
    private final ArenaBalanceProperties balanceProperties;

    public InGameRewardsService(
            InMemoryArenaLedgerStore ledgerStore,
            FaucetPendingBalanceStore pendingBalanceStore,
            ArenaBalanceProperties balanceProperties
    ) {
        this.ledgerStore = ledgerStore;
        this.pendingBalanceStore = pendingBalanceStore;
        this.balanceProperties = balanceProperties;
    }

    public synchronized ArenaPlayerState joinOrRefresh(UserAccount account, String displayName, BigDecimal pendingMirrorFromClient) {
        BigDecimal mirror = resolvePendingMirror(account, pendingMirrorFromClient);
        return ledgerStore.find(account.getId()).map(existing -> {
            existing.setDisplayName(displayName);
            existing.setPendingDisplayMirror(mirror);
            existing.setStatus("alive");
            existing.setUpdatedAt(Instant.now());
            existing.setSpawnShieldUntil(
                    Instant.now().plusSeconds(balanceProperties.getSpawnShieldDurationSeconds())
            );
            return ledgerStore.save(existing);
        }).orElseGet(() -> {
            ArenaPlayerState created = new ArenaPlayerState();
            created.setUserId(account.getId());
            created.setDisplayName(displayName);
            created.setPendingDisplayMirror(mirror);
            BigDecimal seed = mirror.compareTo(BigDecimal.ZERO) > 0 ? mirror : BigDecimal.valueOf(50);
            created.setFaucetBalance(seed);
            created.setProtectedBalance(BigDecimal.ZERO);
            created.setStatus("alive");
            created.setSpawnShieldUntil(
                    Instant.now().plusSeconds(balanceProperties.getSpawnShieldDurationSeconds())
            );
            created.setCreatedAt(Instant.now());
            created.setUpdatedAt(Instant.now());
            log.info("arena.join userId={} mirrorPending={} seededLedger={}", account.getId(), mirror, seed);
            return ledgerStore.save(created);
        });
    }

    public synchronized ArenaEliminationResponse applyElimination(UserAccount actor, ArenaEliminationRequest request) {
        if (!balanceProperties.isEnabled()) {
            return rejected(request, "ARENA_DISABLED");
        }
        if (!actor.getId().equals(request.killerUserId())) {
            return rejected(request, "KILLER_MISMATCH");
        }
        if (ledgerStore.wasEventProcessed(request.eventId())) {
            return rejected(request, "DUPLICATE_EVENT");
        }
        if (request.killerUserId().equals(request.victimUserId())) {
            return rejected(request, "SELF_ELIMINATION");
        }

        ArenaPlayerState killer = ledgerStore.find(request.killerUserId()).orElse(null);
        ArenaPlayerState victim = ledgerStore.find(request.victimUserId()).orElse(null);
        if (killer == null || victim == null) {
            return rejected(request, "PLAYER_NOT_FOUND");
        }

        if (!ledgerStore.markEventProcessed(request.eventId())) {
            return rejected(request, "DUPLICATE_EVENT");
        }

        BigDecimal loot = victim.getFaucetBalance()
                .multiply(BigDecimal.valueOf(balanceProperties.getLootRate()))
                .min(BigDecimal.valueOf(balanceProperties.getLootCapPerElimination()))
                .setScale(0, RoundingMode.DOWN)
                .max(BigDecimal.ZERO);

        if (loot.compareTo(BigDecimal.valueOf(balanceProperties.getMinimumFaucetBalanceToLoot())) < 0
                && loot.compareTo(BigDecimal.ZERO) > 0) {
            // sous le minimum configuré : pas de transfert
            loot = BigDecimal.ZERO;
        }

        // protectedBalance jamais diminué ; pending faucet store jamais touché
        victim.setFaucetBalance(victim.getFaucetBalance().subtract(loot).max(BigDecimal.ZERO));
        victim.setStatus("eliminated");
        victim.setDeaths(victim.getDeaths() + 1);
        victim.setUpdatedAt(Instant.now());

        killer.setFaucetBalance(killer.getFaucetBalance().add(loot));
        killer.setKills(killer.getKills() + 1);
        killer.setUpdatedAt(Instant.now());

        ledgerStore.save(victim);
        ledgerStore.save(killer);

        log.info(
                "arena.loot eventId={} killer={} victim={} amount={} (ledger-only, no wallet/claim)",
                request.eventId(),
                killer.getUserId(),
                victim.getUserId(),
                loot
        );

        return new ArenaEliminationResponse(
                request.eventId(),
                true,
                null,
                killer.getUserId(),
                victim.getUserId(),
                loot,
                killer.getFaucetBalance(),
                victim.getFaucetBalance()
        );
    }

    /**
     * Miroir lecture : pending faucet réel si wallet lié, sinon valeur client (affichage).
     * Aucun débit.
     */
    private BigDecimal resolvePendingMirror(UserAccount account, BigDecimal clientMirror) {
        String wallet = account.getWalletAddress();
        if (wallet != null && !wallet.isBlank()) {
            try {
                return pendingBalanceStore.get(wallet).max(BigDecimal.ZERO);
            } catch (RuntimeException ex) {
                log.warn("arena.pendingMirror fallback userId={}", account.getId());
            }
        }
        return clientMirror == null ? BigDecimal.ZERO : clientMirror.max(BigDecimal.ZERO);
    }

    private ArenaEliminationResponse rejected(ArenaEliminationRequest request, String reason) {
        BigDecimal killerBal = ledgerStore.find(request.killerUserId())
                .map(ArenaPlayerState::getFaucetBalance)
                .orElse(BigDecimal.ZERO);
        BigDecimal victimBal = ledgerStore.find(request.victimUserId())
                .map(ArenaPlayerState::getFaucetBalance)
                .orElse(BigDecimal.ZERO);
        return new ArenaEliminationResponse(
                request.eventId(),
                false,
                reason,
                request.killerUserId(),
                request.victimUserId(),
                BigDecimal.ZERO,
                killerBal,
                victimBal
        );
    }
}
