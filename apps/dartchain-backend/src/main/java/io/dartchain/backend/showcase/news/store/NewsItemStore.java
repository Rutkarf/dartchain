package io.dartchain.backend.showcase.news.store;

import io.dartchain.backend.showcase.model.NewsItem;

import java.util.List;

public interface NewsItemStore {

    List<NewsItem> findAllPersisted();

    void save(NewsItem item);

    void deleteById(String id);

    void saveAll(List<NewsItem> items);
}
