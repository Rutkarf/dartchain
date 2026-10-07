package io.dartchain.backend.persistence.repository;

import io.dartchain.backend.persistence.entity.QuestProgressEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface QuestProgressJpaRepository extends JpaRepository<QuestProgressEntity, UUID> {
}
