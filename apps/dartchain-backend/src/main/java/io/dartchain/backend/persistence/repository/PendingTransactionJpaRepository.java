package io.dartchain.backend.persistence.repository;

import io.dartchain.backend.persistence.entity.PendingTransactionEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PendingTransactionJpaRepository extends JpaRepository<PendingTransactionEntity, String> {

    List<PendingTransactionEntity> findAllByOrderByCreatedAtAsc();
}
