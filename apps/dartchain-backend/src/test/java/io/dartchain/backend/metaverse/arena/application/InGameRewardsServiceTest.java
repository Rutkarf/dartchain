package io.dartchain.backend.metaverse.arena.application;

import io.dartchain.backend.auth.model.UserAccount;
import io.dartchain.backend.faucet.store.FaucetPendingBalanceStore;
import io.dartchain.backend.metaverse.arena.config.ArenaBalanceProperties;
import io.dartchain.backend.metaverse.arena.dto.ArenaEliminationRequest;
import io.dartchain.backend.metaverse.arena.dto.ArenaEliminationResponse;
import io.dartchain.backend.metaverse.arena.model.ArenaPlayerState;
import io.dartchain.backend.metaverse.arena.store.InMemoryArenaLedgerStore;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class InGameRewardsServiceTest {

    private InMemoryArenaLedgerStore ledgerStore;
    private RecordingPendingStore pendingStore;
    private InGameRewardsService service;

    @BeforeEach
    void setUp() {
        ledgerStore = new InMemoryArenaLedgerStore();
        pendingStore = new RecordingPendingStore();
        ArenaBalanceProperties props = new ArenaBalanceProperties();
        props.setLootRate(0.10);
        props.setLootCapPerElimination(25);
        props.setMinimumFaucetBalanceToLoot(1);
        service = new InGameRewardsService(ledgerStore, pendingStore, props);
    }

    @Test
    void joinSeedsLedgerFromPendingMirrorWithoutDebitingPendingStore() {
        UserAccount account = account("u1", "Alice", "R4V3abc");
        pendingStore.add("R4V3abc", new BigDecimal("80"));

        ArenaPlayerState state = service.joinOrRefresh(account, "Alice", BigDecimal.TEN);

        assertThat(state.getFaucetBalance()).isEqualByComparingTo("80");
        assertThat(state.getPendingDisplayMirror()).isEqualByComparingTo("80");
        assertThat(pendingStore.get("R4V3abc")).isEqualByComparingTo("80");
        assertThat(pendingStore.debitCalls).isZero();
    }

    @Test
    void eliminationTransfersOnlyArenaLedgerAndIsIdempotent() {
        UserAccount killer = account("killer", "Killer", null);
        UserAccount victim = account("victim", "Victim", null);
        service.joinOrRefresh(killer, "Killer", BigDecimal.valueOf(10));
        ArenaPlayerState victimState = service.joinOrRefresh(victim, "Victim", BigDecimal.valueOf(100));
        victimState.setFaucetBalance(new BigDecimal("100"));
        ledgerStore.save(victimState);

        ArenaEliminationRequest req = new ArenaEliminationRequest("evt-1", "killer", "victim");
        ArenaEliminationResponse first = service.applyElimination(killer, req);
        ArenaEliminationResponse second = service.applyElimination(killer, req);

        assertThat(first.accepted()).isTrue();
        assertThat(first.lootAmount()).isEqualByComparingTo("10");
        assertThat(second.accepted()).isFalse();
        assertThat(second.reason()).isEqualTo("DUPLICATE_EVENT");
        assertThat(pendingStore.debitCalls).isZero();
        assertThat(pendingStore.addCalls).isZero();
    }

    @Test
    void rejectsKillerMismatch() {
        UserAccount actor = account("other", "Other", null);
        service.joinOrRefresh(account("killer", "K", null), "K", BigDecimal.TEN);
        service.joinOrRefresh(account("victim", "V", null), "V", BigDecimal.TEN);

        ArenaEliminationResponse res = service.applyElimination(
                actor,
                new ArenaEliminationRequest("evt-2", "killer", "victim")
        );

        assertThat(res.accepted()).isFalse();
        assertThat(res.reason()).isEqualTo("KILLER_MISMATCH");
    }

    private static UserAccount account(String id, String username, String wallet) {
        UserAccount account = new UserAccount();
        account.setId(id);
        account.setUsername(username);
        account.setWalletAddress(wallet);
        return account;
    }

    private static final class RecordingPendingStore implements FaucetPendingBalanceStore {
        private final java.util.Map<String, BigDecimal> map = new java.util.HashMap<>();
        int debitCalls;
        int addCalls;

        @Override
        public BigDecimal get(String walletAddress) {
            return map.getOrDefault(walletAddress, BigDecimal.ZERO);
        }

        @Override
        public BigDecimal add(String walletAddress, BigDecimal amount) {
            addCalls++;
            BigDecimal next = get(walletAddress).add(amount);
            map.put(walletAddress, next);
            return next;
        }

        @Override
        public BigDecimal debit(String walletAddress, BigDecimal amount) {
            debitCalls++;
            BigDecimal current = get(walletAddress);
            BigDecimal debited = current.min(amount).max(BigDecimal.ZERO);
            map.put(walletAddress, current.subtract(debited));
            return debited;
        }
    }
}
