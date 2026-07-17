package io.dartchain.backend.showcase.faq;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.dartchain.backend.showcase.faq.store.FaqQuestionStore;
import io.dartchain.backend.showcase.model.FaqQuestion;
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
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Component
@ConditionalOnProperty(name = "dartchain.persistence.mode", havingValue = "memory", matchIfMissing = true)
public class JsonFaqQuestionStore implements FaqQuestionStore {

    private static final Logger log = LoggerFactory.getLogger(JsonFaqQuestionStore.class);

    private final ObjectMapper objectMapper;
    private final Path storePath;
    private final List<FaqQuestion> questions = new ArrayList<>();
    private final Map<String, Map<String, String>> votes = new HashMap<>();

    public JsonFaqQuestionStore(
            ObjectMapper objectMapper,
            @Value("${faq.questions.path:data/faq-questions.json}") String storePath
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
            FaqQuestionSnapshot snapshot = objectMapper.readValue(
                    Files.readString(storePath),
                    FaqQuestionSnapshot.class
            );
            synchronized (this) {
                questions.clear();
                questions.addAll(snapshot.getQuestions().stream().map(this::cloneQuestion).toList());
                votes.clear();
                snapshot.getVotes().forEach((questionId, userVotes) ->
                        votes.put(questionId, new HashMap<>(userVotes))
                );
            }
        } catch (IOException exception) {
            throw new IllegalStateException("Unable to load FAQ questions from " + storePath, exception);
        }
    }

    @Override
    public synchronized List<FaqQuestion> findAll() {
        return questions.stream().map(this::cloneQuestion).toList();
    }

    @Override
    public synchronized Optional<FaqQuestion> findById(String id) {
        if (id == null || id.isBlank()) {
            return Optional.empty();
        }
        return questions.stream()
                .filter(question -> id.equals(question.getId()))
                .findFirst()
                .map(this::cloneQuestion);
    }

    @Override
    public synchronized void save(FaqQuestion question) {
        questions.removeIf(existing -> existing.getId().equals(question.getId()));
        questions.add(cloneQuestion(question));
        persist();
    }

    @Override
    public synchronized void saveAll(List<FaqQuestion> items) {
        questions.clear();
        if (items != null) {
            questions.addAll(items.stream().map(this::cloneQuestion).toList());
        }
        persist();
    }

    @Override
    public synchronized Map<String, Map<String, String>> getVotes() {
        Map<String, Map<String, String>> copy = new HashMap<>();
        votes.forEach((questionId, userVotes) -> copy.put(questionId, new HashMap<>(userVotes)));
        return copy;
    }

    @Override
    public synchronized void replaceVotes(Map<String, Map<String, String>> nextVotes) {
        votes.clear();
        if (nextVotes != null) {
            nextVotes.forEach((questionId, userVotes) ->
                    votes.put(questionId, new HashMap<>(userVotes))
            );
        }
        persist();
    }

    @Override
    public synchronized void setVote(String questionId, String userId, String direction) {
        votes.computeIfAbsent(questionId, ignored -> new HashMap<>()).put(userId, direction);
        persist();
    }

    @Override
    public synchronized void removeVote(String questionId, String userId) {
        Map<String, String> userVotes = votes.get(questionId);
        if (userVotes != null) {
            userVotes.remove(userId);
            if (userVotes.isEmpty()) {
                votes.remove(questionId);
            }
        }
        persist();
    }

    private void persist() {
        try {
            if (storePath.getParent() != null) {
                Files.createDirectories(storePath.getParent());
            }

            FaqQuestionSnapshot snapshot = new FaqQuestionSnapshot();
            snapshot.setQuestions(questions.stream().map(this::cloneQuestion).toList());
            snapshot.setVotes(getVotes());
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(storePath.toFile(), snapshot);
        } catch (IOException exception) {
            log.warn("Unable to persist FAQ questions to {}: {}", storePath, exception.getMessage());
        }
    }

    private FaqQuestion cloneQuestion(FaqQuestion source) {
        return objectMapper.convertValue(source, FaqQuestion.class);
    }
}
