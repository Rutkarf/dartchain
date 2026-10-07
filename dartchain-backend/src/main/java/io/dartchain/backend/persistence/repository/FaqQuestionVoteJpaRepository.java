package io.dartchain.backend.persistence.repository;

import io.dartchain.backend.persistence.entity.FaqQuestionVoteEntity;
import io.dartchain.backend.persistence.entity.FaqQuestionVoteId;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FaqQuestionVoteJpaRepository extends JpaRepository<FaqQuestionVoteEntity, FaqQuestionVoteId> {
}
