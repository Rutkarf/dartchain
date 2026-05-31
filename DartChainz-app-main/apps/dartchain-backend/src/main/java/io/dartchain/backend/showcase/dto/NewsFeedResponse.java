package io.dartchain.backend.showcase.dto;

import java.util.List;

public record NewsFeedResponse(
        String headline,
        String lastTransaction,
        String featuredId,
        List<NewsItemResponse> items,
        List<String> categories,
        String liveActivity,
        String lastRefreshedAt,
        int totalCount,
        boolean hasMore
) {}
