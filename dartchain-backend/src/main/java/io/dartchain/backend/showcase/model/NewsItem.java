package io.dartchain.backend.showcase.model;

import java.time.Instant;

public class NewsItem {

    private String id;
    private String category;
    private String title;
    private String summary;
    private String body;
    private Instant publishedAt;
    private NewsSource source;
    private String actionType;
    private String actionTarget;

    public NewsItem() {
    }

    public NewsItem(
            String id,
            String category,
            String title,
            String summary,
            String body,
            Instant publishedAt,
            NewsSource source,
            String actionType,
            String actionTarget
    ) {
        this.id = id;
        this.category = category;
        this.title = title;
        this.summary = summary;
        this.body = body;
        this.publishedAt = publishedAt;
        this.source = source;
        this.actionType = actionType;
        this.actionTarget = actionTarget;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getSummary() {
        return summary;
    }

    public void setSummary(String summary) {
        this.summary = summary;
    }

    public String getBody() {
        return body;
    }

    public void setBody(String body) {
        this.body = body;
    }

    public Instant getPublishedAt() {
        return publishedAt;
    }

    public void setPublishedAt(Instant publishedAt) {
        this.publishedAt = publishedAt;
    }

    public NewsSource getSource() {
        return source;
    }

    public void setSource(NewsSource source) {
        this.source = source;
    }

    public String getActionType() {
        return actionType;
    }

    public void setActionType(String actionType) {
        this.actionType = actionType;
    }

    public String getActionTarget() {
        return actionTarget;
    }

    public void setActionTarget(String actionTarget) {
        this.actionTarget = actionTarget;
    }
}
