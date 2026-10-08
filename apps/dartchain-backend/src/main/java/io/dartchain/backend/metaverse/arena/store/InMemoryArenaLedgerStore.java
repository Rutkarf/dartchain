package io.dartchain.backend.metaverse.arena.store;

import io.dartchain.backend.metaverse.arena.model.ArenaPlayerState;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Ledger arène isolé (Q1=C) — jamais le store faucet pending / blockchain.
 * La durée de vie est celle du processus : ce ledger n'a pas de table.
 */
@Component
public class InMemoryArenaLedgerStore {

    private final Map<String, ArenaPlayerState> byUserId = new ConcurrentHashMap<>();
    private final ConcurrentHashMap.KeySetView<String, Boolean> processedEventIds =
            ConcurrentHashMap.newKeySet();

    public Optional<ArenaPlayerState> find(String userId) {
        return Optional.ofNullable(byUserId.get(userId));
    }

    public ArenaPlayerState save(ArenaPlayerState state) {
        byUserId.put(state.getUserId(), state);
        return state;
    }

    public Collection<ArenaPlayerState> findAll() {
        return byUserId.values();
    }

    public boolean markEventProcessed(String eventId) {
        return processedEventIds.add(eventId);
    }

    public boolean wasEventProcessed(String eventId) {
        return processedEventIds.contains(eventId);
    }
}
