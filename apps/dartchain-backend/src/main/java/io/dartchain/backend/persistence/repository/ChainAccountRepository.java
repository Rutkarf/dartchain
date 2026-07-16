package io.dartchain.backend.persistence.repository;

import io.dartchain.backend.persistence.entity.ChainAccountEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChainAccountRepository extends JpaRepository<ChainAccountEntity, String> {
}
