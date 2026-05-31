package io.dartchain.backend.showcase.controller;

import io.dartchain.backend.showcase.dto.NewsFeedResponse;
import io.dartchain.backend.showcase.dto.NewsItemResponse;
import io.dartchain.backend.showcase.service.NewsService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ShowcaseNewsController.class)
class ShowcaseNewsControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private NewsService newsService;

    @Test
    void getFeed_returnsOk() throws Exception {
        when(newsService.getFeed(isNull(), isNull(), anyInt(), anyInt())).thenReturn(
                new NewsFeedResponse(
                        "DartChain",
                        "TX",
                        "editorial-1",
                        List.of(new NewsItemResponse(
                                "1",
                                "Réseau",
                                "Title",
                                "Summary",
                                "Body",
                                "2026-01-01T00:00:00Z",
                                "il y a 1 min",
                                "EDITORIAL",
                                "NONE",
                                null,
                                true
                        )),
                        List.of("Réseau"),
                        "Bloc #0 · chaîne active",
                        "2026-01-01T00:00:00Z",
                        1,
                        false
                )
        );

        mockMvc.perform(get("/api/showcase/news"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.headline").value("DartChain"))
                .andExpect(jsonPath("$.items[0].title").value("Title"))
                .andExpect(jsonPath("$.liveActivity").value("Bloc #0 · chaîne active"));
    }
}
