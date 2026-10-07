package io.dartchain.backend.persistence.repository;

import io.dartchain.backend.persistence.entity.RateLimitBucketEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RateLimitBucketJpaRepository extends JpaRepository<RateLimitBucketEntity, String> {
}
