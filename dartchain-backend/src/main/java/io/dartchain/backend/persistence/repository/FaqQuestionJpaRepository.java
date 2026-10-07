package io.dartchain.backend.persistence.repository;

import io.dartchain.backend.persistence.entity.FaqQuestionEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FaqQuestionJpaRepository extends JpaRepository<FaqQuestionEntity, String> {
}
