package io.dartchain.backend.showcase.service;

import io.dartchain.backend.service.BlockchainService;
import io.dartchain.backend.service.PendingTransactionService;
import io.dartchain.backend.showcase.dto.NewsFeedResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NewsServiceTest {

    @Mock
    private BlockchainService blockchainService;

    @Mock
    private PendingTransactionService pendingTransactionService;

    private NewsService newsService;

    @BeforeEach
    void setUp() {
        newsService = new NewsService(blockchainService, pendingTransactionService);
        newsService.seedEditorialNews();
        when(pendingTransactionService.getPendingTransactions()).thenReturn(Collections.emptyList());
        when(blockchainService.getBlocks()).thenReturn(Collections.emptyList());
    }

    @Test
    void getFeed_returnsAtLeastTenItemsOnInit() {
        NewsFeedResponse feed = newsService.getFeed(null, null, 10, 0);

        assertThat(feed.items()).hasSizeGreaterThanOrEqualTo(10);
    }

    @Test
    void getFeed_returnsEditorialItems() {
        NewsFeedResponse feed = newsService.getFeed(null, null, 20, 0);

        assertThat(feed.items()).isNotEmpty();
        assertThat(feed.categories()).contains("Réseau", "R4V3");
    }

    @Test
    void getFeed_filtersByCategory() {
        NewsFeedResponse feed = newsService.getFeed("R4V3", null, 20, 0);

        assertThat(feed.items()).allMatch(item -> item.category().equalsIgnoreCase("R4V3"));
    }

    @Test
    void getById_returnsItemWhenExists() {
        String id = newsService.getFeed(null, null, 1, 0).items().get(0).id();

        assertThat(newsService.getById(id)).isPresent();
    }
}
