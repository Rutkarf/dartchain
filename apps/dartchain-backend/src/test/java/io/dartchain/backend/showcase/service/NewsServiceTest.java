package io.dartchain.backend.showcase.service;

import io.dartchain.backend.service.BlockchainService;
import io.dartchain.backend.service.PendingTransactionService;
import io.dartchain.backend.showcase.dto.NewsFeedResponse;
import io.dartchain.backend.showcase.news.JsonNewsItemStore;
import io.dartchain.backend.support.TestObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NewsServiceTest {

    @Mock
    private BlockchainService blockchainService;

    @Mock
    private PendingTransactionService pendingTransactionService;

    @TempDir
    Path tempDir;

    private NewsService newsService;

    @BeforeEach
    void setUp() {
        newsService = new NewsService(
                blockchainService,
                pendingTransactionService,
                new JsonNewsItemStore(
                        TestObjectMapper.create(),
                        tempDir.resolve("news-items.json").toString()
                )
        );
        newsService.seedEditorialNews();
        when(pendingTransactionService.getPendingTransactions()).thenReturn(java.util.Collections.emptyList());
        when(blockchainService.getBlocks()).thenReturn(java.util.Collections.emptyList());
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
