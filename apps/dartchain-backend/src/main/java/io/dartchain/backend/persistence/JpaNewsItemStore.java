package io.dartchain.backend.persistence;

import io.dartchain.backend.showcase.model.NewsItem;
import io.dartchain.backend.showcase.model.NewsSource;
import io.dartchain.backend.showcase.news.store.NewsItemStore;
import io.dartchain.backend.persistence.entity.NewsItemEntity;
import io.dartchain.backend.persistence.repository.NewsItemJpaRepository;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Component
@ConditionalOnProperty(name = "dartchain.persistence.mode", havingValue = "postgres")
public class JpaNewsItemStore implements NewsItemStore {

    private final NewsItemJpaRepository repository;

    public JpaNewsItemStore(NewsItemJpaRepository repository) {
        this.repository = repository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<NewsItem> findAllPersisted() {
        return repository.findAllByOrderByPublishedAtDesc().stream()
                .map(this::toModel)
                .filter(item -> item.getSource() != NewsSource.CHAIN)
                .toList();
    }

    @Override
    @Transactional
    public void save(NewsItem item) {
        if (item == null || item.getSource() == NewsSource.CHAIN) {
            return;
        }
        repository.save(toEntity(item));
    }

    @Override
    @Transactional
    public void deleteById(String id) {
        if (id == null || id.isBlank()) {
            return;
        }
        repository.deleteById(id);
    }

    @Override
    @Transactional
    public void saveAll(List<NewsItem> items) {
        repository.deleteAllInBatch();
        if (items != null && !items.isEmpty()) {
            repository.saveAll(items.stream()
                    .filter(item -> item.getSource() != NewsSource.CHAIN)
                    .map(this::toEntity)
                    .toList());
        }
    }

    private NewsItem toModel(NewsItemEntity entity) {
        return new NewsItem(
                entity.getId(),
                entity.getCategory(),
                entity.getTitle(),
                entity.getSummary(),
                entity.getBody(),
                entity.getPublishedAt(),
                NewsSource.valueOf(entity.getSource()),
                entity.getActionType(),
                entity.getActionTarget()
        );
    }

    private NewsItemEntity toEntity(NewsItem item) {
        NewsItemEntity entity = new NewsItemEntity();
        entity.setId(item.getId());
        entity.setCategory(item.getCategory());
        entity.setTitle(item.getTitle());
        entity.setSummary(item.getSummary());
        entity.setBody(item.getBody());
        entity.setPublishedAt(item.getPublishedAt() != null ? item.getPublishedAt() : Instant.now());
        entity.setSource(item.getSource().name());
        entity.setActionType(item.getActionType());
        entity.setActionTarget(item.getActionTarget());
        return entity;
    }
}
