package io.dartchain.backend.showcase.dto;

public record NewsItemResponse(
        String id,
        String category,
        String title,
        String summary,
        String body,
        String publishedAt,
        String relativeTime,
        String source,
        String actionType,
        String actionTarget,
        boolean featured
) {}
