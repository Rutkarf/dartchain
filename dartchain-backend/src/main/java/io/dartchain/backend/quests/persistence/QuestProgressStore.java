package io.dartchain.backend.quests.persistence;

import io.dartchain.backend.quests.model.QuestProgressState;

import java.util.Optional;

public interface QuestProgressStore {

    Optional<QuestProgressState> findByUserId(String userId);

    QuestProgressState save(String userId, QuestProgressState state);
}
