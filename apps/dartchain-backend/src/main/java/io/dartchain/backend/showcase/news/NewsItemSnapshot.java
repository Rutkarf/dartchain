package io.dartchain.backend.showcase.news;

import io.dartchain.backend.showcase.model.NewsItem;

import java.util.List;

public class NewsItemSnapshot {

    private List<NewsItem> items = List.of();

    public NewsItemSnapshot() {
    }

    public List<NewsItem> getItems() {
        return items;
    }

    public void setItems(List<NewsItem> items) {
        this.items = items != null ? items : List.of();
    }
}
