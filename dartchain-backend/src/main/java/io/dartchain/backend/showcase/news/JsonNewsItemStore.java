package io.dartchain.backend.showcase.news;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.dartchain.backend.showcase.model.NewsItem;
import io.dartchain.backend.showcase.model.NewsSource;
import io.dartchain.backend.showcase.news.store.NewsItemStore;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

@Component
@ConditionalOnProperty(name = "dartchain.persistence.mode", havingValue = "memory", matchIfMissing = true)
public class JsonNewsItemStore implements NewsItemStore {

    private static final Logger log = LoggerFactory.getLogger(JsonNewsItemStore.class);

    private final ObjectMapper objectMapper;
    private final Path storePath;
    private final List<NewsItem> items = new ArrayList<>();

    public JsonNewsItemStore(
            ObjectMapper objectMapper,
            @Value("${news.items.path:data/news-items.json}") String storePath
    ) {
        this.objectMapper = objectMapper;
        this.storePath = Path.of(storePath);
    }

    @PostConstruct
    public void loadFromDisk() {
        if (!Files.exists(storePath)) {
            return;
        }

        try {
            NewsItemSnapshot snapshot = objectMapper.readValue(
                    Files.readString(storePath),
                    NewsItemSnapshot.class
            );
            synchronized (items) {
                items.clear();
                items.addAll(snapshot.getItems().stream()
                        .filter(this::isPersisted)
                        .map(this::cloneItem)
                        .toList());
            }
        } catch (IOException exception) {
            throw new IllegalStateException("Unable to load news items from " + storePath, exception);
        }
    }

    @Override
    public synchronized List<NewsItem> findAllPersisted() {
        return items.stream().map(this::cloneItem).toList();
    }

    @Override
    public synchronized void save(NewsItem item) {
        if (!isPersisted(item)) {
            return;
        }

        items.removeIf(existing -> existing.getId().equals(item.getId()));
        items.add(cloneItem(item));
        persist();
    }

    @Override
    public synchronized void deleteById(String id) {
        if (id == null || id.isBlank()) {
            return;
        }

        boolean removed = items.removeIf(item -> id.equals(item.getId()));
        if (removed) {
            persist();
        }
    }

    @Override
    public synchronized void saveAll(List<NewsItem> persistedItems) {
        items.clear();
        if (persistedItems != null) {
            items.addAll(persistedItems.stream()
                    .filter(this::isPersisted)
                    .map(this::cloneItem)
                    .toList());
        }
        persist();
    }

    private boolean isPersisted(NewsItem item) {
        return item != null && item.getSource() != NewsSource.CHAIN;
    }

    private void persist() {
        try {
            if (storePath.getParent() != null) {
                Files.createDirectories(storePath.getParent());
            }

            NewsItemSnapshot snapshot = new NewsItemSnapshot();
            snapshot.setItems(items.stream().map(this::cloneItem).toList());
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(storePath.toFile(), snapshot);
        } catch (IOException exception) {
            log.warn("Unable to persist news items to {}: {}", storePath, exception.getMessage());
        }
    }

    private NewsItem cloneItem(NewsItem source) {
        return objectMapper.convertValue(source, NewsItem.class);
    }
}
