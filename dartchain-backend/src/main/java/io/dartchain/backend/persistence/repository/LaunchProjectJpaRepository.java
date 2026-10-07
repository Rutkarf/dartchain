package io.dartchain.backend.persistence.repository;

import io.dartchain.backend.persistence.entity.LaunchProjectEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LaunchProjectJpaRepository extends JpaRepository<LaunchProjectEntity, String> {

    List<LaunchProjectEntity> findAllByOrderByCreatedAtDesc();

    boolean existsBySymbolIgnoreCase(String symbol);
}
