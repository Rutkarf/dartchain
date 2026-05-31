package io.dartchain.backend.showcase.controller;

import io.dartchain.backend.showcase.dto.NewsFeedResponse;
import io.dartchain.backend.showcase.dto.NewsItemResponse;
import io.dartchain.backend.showcase.service.NewsService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/showcase/news")
public class ShowcaseNewsController {

    private final NewsService newsService;

    public ShowcaseNewsController(NewsService newsService) {
        this.newsService = newsService;
    }

    @GetMapping
    public NewsFeedResponse getFeed(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String source,
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(defaultValue = "0") int offset
    ) {
        return newsService.getFeed(category, source, limit, offset);
    }

    @GetMapping("/{id}")
    public NewsItemResponse getById(@PathVariable String id) {
        return newsService.getById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "News not found"));
    }
}
