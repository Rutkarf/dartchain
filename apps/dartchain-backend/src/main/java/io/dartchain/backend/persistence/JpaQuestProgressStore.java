package io.dartchain.backend.persistence;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.dartchain.backend.quests.model.QuestProgressState;
import io.dartchain.backend.quests.model.QuestTaskState;
import io.dartchain.backend.quests.persistence.QuestProgressStore;
import io.dartchain.backend.persistence.entity.QuestProgressEntity;
import io.dartchain.backend.persistence.repository.QuestProgressJpaRepository;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Component
@ConditionalOnProperty(name = "dartchain.persistence.mode", havingValue = "postgres")
public class JpaQuestProgressStore implements QuestProgressStore {

    private static final TypeReference<Map<String, QuestTaskState>> TASKS_TYPE =
            new TypeReference<>() {
            };
    private static final TypeReference<List<Integer>> EXPLORED_BLOCKS_TYPE =
            new TypeReference<>() {
            };

    private final QuestProgressJpaRepository repository;
    private final ObjectMapper objectMapper;

    public JpaQuestProgressStore(QuestProgressJpaRepository repository, ObjectMapper objectMapper) {
        this.repository = repository;
        this.objectMapper = objectMapper;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<QuestProgressState> findByUserId(String userId) {
        return parseUuid(userId)
                .flatMap(repository::findById)
                .map(this::toState);
    }

    @Override
    @Transactional
    public QuestProgressState save(String userId, QuestProgressState state) {
        UUID uuid = parseUuid(userId)
                .orElseThrow(() -> new IllegalArgumentException("Invalid user id: " + userId));

        QuestProgressEntity entity = repository.findById(uuid).orElseGet(QuestProgressEntity::new);
        entity.setUserId(uuid);
        entity.setDayKey(state.getDayKey());
        entity.setWeekKey(resolveWeekKey(state));
        entity.setTasksJson(writeTasks(state.getTasks()));
        entity.setExploredBlocksJson(writeExploredBlocks(state.getExploredBlockIndices()));
        entity.setMissionClaimed(state.isMissionClaimed());
        entity.setWeeklyClaimed(state.isWeeklyClaimed());
        entity.setTotalXp(state.getTotalXp());
        entity.setPendingMts(state.getPendingMts());
        entity.setUpdatedAt(Instant.now());

        repository.save(entity);
        return toState(entity);
    }

    private QuestProgressState toState(QuestProgressEntity entity) {
        QuestProgressState state = new QuestProgressState();
        state.setDayKey(entity.getDayKey());
        state.setWeekKey(entity.getWeekKey());
        state.setTasks(readTasks(entity.getTasksJson()));
        state.setExploredBlockIndices(readExploredBlocks(entity.getExploredBlocksJson()));
        state.setMissionClaimed(entity.isMissionClaimed());
        state.setWeeklyClaimed(entity.isWeeklyClaimed());
        state.setTotalXp(entity.getTotalXp());
        state.setPendingMts(entity.getPendingMts());
        return state;
    }

    private String resolveWeekKey(QuestProgressState state) {
        if (state.getWeekKey() != null && !state.getWeekKey().isBlank()) {
            return state.getWeekKey();
        }
        return state.getDayKey();
    }

    private Map<String, QuestTaskState> readTasks(String json) {
        if (json == null || json.isBlank()) {
            return new LinkedHashMap<>();
        }

        try {
            return objectMapper.readValue(json, TASKS_TYPE);
        } catch (Exception exception) {
            throw new IllegalStateException("Unable to read quest tasks JSON", exception);
        }
    }

    private String writeTasks(Map<String, QuestTaskState> tasks) {
        try {
            return objectMapper.writeValueAsString(tasks != null ? tasks : Map.of());
        } catch (Exception exception) {
            throw new IllegalStateException("Unable to write quest tasks JSON", exception);
        }
    }

    private List<Integer> readExploredBlocks(String json) {
        if (json == null || json.isBlank()) {
            return new ArrayList<>();
        }

        try {
            return objectMapper.readValue(json, EXPLORED_BLOCKS_TYPE);
        } catch (Exception exception) {
            throw new IllegalStateException("Unable to read explored blocks JSON", exception);
        }
    }

    private String writeExploredBlocks(List<Integer> exploredBlocks) {
        try {
            return objectMapper.writeValueAsString(exploredBlocks != null ? exploredBlocks : List.of());
        } catch (Exception exception) {
            throw new IllegalStateException("Unable to write explored blocks JSON", exception);
        }
    }

    private Optional<UUID> parseUuid(String value) {
        try {
            return Optional.of(UUID.fromString(value));
        } catch (IllegalArgumentException exception) {
            return Optional.empty();
        }
    }
}
