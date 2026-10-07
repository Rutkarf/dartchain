package io.dartchain.backend.quests.persistence;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.dartchain.backend.quests.model.QuestProgressSnapshot;
import io.dartchain.backend.quests.model.QuestProgressState;
import io.dartchain.backend.quests.persistence.QuestProgressStore;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Component
@ConditionalOnProperty(name = "dartchain.persistence.mode", havingValue = "memory", matchIfMissing = true)
public class JsonQuestProgressStore implements QuestProgressStore {

    private static final Logger log = LoggerFactory.getLogger(JsonQuestProgressStore.class);

    private final ObjectMapper objectMapper;
    private final Path storePath;
    private final List<QuestProgressSnapshot.QuestProgressEntry> entries = new ArrayList<>();

    public JsonQuestProgressStore(
            ObjectMapper objectMapper,
            @Value("${quests.progress.path:data/quest-progress.json}") String storePath
    ) {
        this.objectMapper = objectMapper;
        this.storePath = Path.of(storePath);
    }

    @PostConstruct
    public void loadFromDisk() {
        if (!Files.exists(storePath)) {
            return;
        }

        try {
            QuestProgressSnapshot snapshot = objectMapper.readValue(
                    Files.readString(storePath),
                    QuestProgressSnapshot.class
            );
            synchronized (entries) {
                entries.clear();
                entries.addAll(snapshot.getEntries());
            }
        } catch (IOException exception) {
            throw new IllegalStateException("Unable to load quest progress from " + storePath, exception);
        }
    }

    @Override
    public synchronized Optional<QuestProgressState> findByUserId(String userId) {
        return entries.stream()
                .filter(entry -> userId.equals(entry.getUserId()))
                .map(QuestProgressSnapshot.QuestProgressEntry::getState)
                .findFirst();
    }

    @Override
    public synchronized QuestProgressState save(String userId, QuestProgressState state) {
        QuestProgressSnapshot.QuestProgressEntry entry = entries.stream()
                .filter(existing -> userId.equals(existing.getUserId()))
                .findFirst()
                .orElseGet(() -> {
                    QuestProgressSnapshot.QuestProgressEntry created =
                            new QuestProgressSnapshot.QuestProgressEntry();
                    created.setUserId(userId);
                    entries.add(created);
                    return created;
                });

        entry.setState(cloneState(state));
        persistToDisk();
        return cloneState(state);
    }

    private void persistToDisk() {
        try {
            if (storePath.getParent() != null) {
                Files.createDirectories(storePath.getParent());
            }

            QuestProgressSnapshot snapshot = new QuestProgressSnapshot();
            snapshot.setEntries(entries.stream().map(this::cloneEntry).toList());
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(storePath.toFile(), snapshot);
        } catch (IOException exception) {
            log.warn("Unable to persist quest progress to {}: {}", storePath, exception.getMessage());
        }
    }

    private QuestProgressSnapshot.QuestProgressEntry cloneEntry(
            QuestProgressSnapshot.QuestProgressEntry source
    ) {
        QuestProgressSnapshot.QuestProgressEntry copy = new QuestProgressSnapshot.QuestProgressEntry();
        copy.setUserId(source.getUserId());
        copy.setState(cloneState(source.getState()));
        return copy;
    }

    private QuestProgressState cloneState(QuestProgressState source) {
        return objectMapper.convertValue(source, QuestProgressState.class);
    }
}
