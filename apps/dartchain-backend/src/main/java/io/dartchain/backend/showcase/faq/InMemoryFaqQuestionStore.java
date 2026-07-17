package io.dartchain.backend.showcase.faq;

import io.dartchain.backend.showcase.faq.store.FaqQuestionStore;
import io.dartchain.backend.showcase.model.FaqQuestion;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Component
@ConditionalOnProperty(name = "dartchain.persistence.mode", havingValue = "postgres")
public class InMemoryFaqQuestionStore implements FaqQuestionStore {

    private final List<FaqQuestion> questions = new ArrayList<>();
    private final Map<String, Map<String, String>> votes = new HashMap<>();

    @Override
    public synchronized List<FaqQuestion> findAll() {
        return List.copyOf(questions);
    }

    @Override
    public synchronized Optional<FaqQuestion> findById(String id) {
        return questions.stream()
                .filter(question -> id.equals(question.getId()))
                .findFirst();
    }

    @Override
    public synchronized void save(FaqQuestion question) {
        questions.removeIf(existing -> existing.getId().equals(question.getId()));
        questions.add(question);
    }

    @Override
    public synchronized void saveAll(List<FaqQuestion> items) {
        questions.clear();
        if (items != null) {
            questions.addAll(items);
        }
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
    }

    @Override
    public synchronized void setVote(String questionId, String userId, String direction) {
        votes.computeIfAbsent(questionId, ignored -> new HashMap<>()).put(userId, direction);
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
    }
}
