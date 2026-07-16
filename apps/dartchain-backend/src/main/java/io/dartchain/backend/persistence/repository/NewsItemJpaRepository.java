package io.dartchain.backend.persistence.repository;

import io.dartchain.backend.persistence.entity.NewsItemEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NewsItemJpaRepository extends JpaRepository<NewsItemEntity, String> {

    List<NewsItemEntity> findAllByOrderByPublishedAtDesc();
}
