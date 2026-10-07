package io.dartchain.backend.persistence;

import io.dartchain.backend.persistence.entity.FaqQuestionEntity;
import io.dartchain.backend.persistence.entity.FaqQuestionVoteEntity;
import io.dartchain.backend.persistence.entity.FaqQuestionVoteId;
import io.dartchain.backend.persistence.repository.FaqQuestionJpaRepository;
import io.dartchain.backend.persistence.repository.FaqQuestionVoteJpaRepository;
import io.dartchain.backend.showcase.faq.store.FaqQuestionStore;
import io.dartchain.backend.showcase.model.FaqQuestion;
import io.dartchain.backend.showcase.model.FaqQuestionStatus;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Component
@ConditionalOnProperty(name = "dartchain.persistence.mode", havingValue = "postgres")
public class JpaFaqQuestionStore implements FaqQuestionStore {

    private final FaqQuestionJpaRepository questions;
    private final FaqQuestionVoteJpaRepository votes;

    public JpaFaqQuestionStore(
            FaqQuestionJpaRepository questions,
            FaqQuestionVoteJpaRepository votes
    ) {
        this.questions = questions;
        this.votes = votes;
    }

    @Override
    @Transactional(readOnly = true)
    public List<FaqQuestion> findAll() {
        return questions.findAll().stream().map(this::toModel).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<FaqQuestion> findById(String id) {
        return questions.findById(id).map(this::toModel);
    }

    @Override
    @Transactional
    public void save(FaqQuestion question) {
        questions.save(toEntity(question));
    }

    @Override
    @Transactional
    public void saveAll(List<FaqQuestion> items) {
        questions.deleteAllInBatch();
        if (items != null && !items.isEmpty()) {
            questions.saveAll(items.stream().map(this::toEntity).toList());
        }
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Map<String, String>> getVotes() {
        Map<String, Map<String, String>> grouped = new HashMap<>();
        for (FaqQuestionVoteEntity vote : votes.findAll()) {
            grouped.computeIfAbsent(vote.getId().getQuestionId(), ignored -> new HashMap<>())
                    .put(vote.getId().getUserId(), vote.getDirection());
        }
        return grouped;
    }

    @Override
    @Transactional
    public void replaceVotes(Map<String, Map<String, String>> nextVotes) {
        votes.deleteAllInBatch();
        if (nextVotes == null) {
            return;
        }
        nextVotes.forEach((questionId, userVotes) -> userVotes.forEach((userId, direction) ->
                saveVote(questionId, userId, direction)
        ));
    }

    @Override
    @Transactional
    public void setVote(String questionId, String userId, String direction) {
        saveVote(questionId, userId, direction);
    }

    @Override
    @Transactional
    public void removeVote(String questionId, String userId) {
        votes.deleteById(new FaqQuestionVoteId(questionId, userId));
    }

    private void saveVote(String questionId, String userId, String direction) {
        FaqQuestionVoteEntity entity = new FaqQuestionVoteEntity();
        entity.setId(new FaqQuestionVoteId(questionId, userId));
        entity.setDirection(direction);
        votes.save(entity);
    }

    private FaqQuestion toModel(FaqQuestionEntity entity) {
        return new FaqQuestion(
                entity.getId(),
                entity.getAuthorId(),
                entity.getAuthorName(),
                entity.getTitle(),
                entity.getBody(),
                entity.getCreatedAt(),
                FaqQuestionStatus.valueOf(entity.getStatus()),
                entity.getScore(),
                entity.getUpvotes(),
                entity.getDownvotes(),
                entity.getAnswerCount(),
                entity.isPendingStaffReview()
        );
    }

    private FaqQuestionEntity toEntity(FaqQuestion question) {
        FaqQuestionEntity entity = new FaqQuestionEntity();
        entity.setId(question.getId());
        entity.setAuthorId(question.getAuthorId());
        entity.setAuthorName(question.getAuthorName());
        entity.setTitle(question.getTitle());
        entity.setBody(question.getBody());
        entity.setCreatedAt(question.getCreatedAt());
        entity.setStatus(question.getStatus() != null ? question.getStatus().name() : FaqQuestionStatus.ACTIVE.name());
        entity.setScore(question.getScore());
        entity.setUpvotes(question.getUpvotes());
        entity.setDownvotes(question.getDownvotes());
        entity.setAnswerCount(question.getAnswerCount());
        entity.setPendingStaffReview(question.isPendingStaffReview());
        return entity;
    }
}
