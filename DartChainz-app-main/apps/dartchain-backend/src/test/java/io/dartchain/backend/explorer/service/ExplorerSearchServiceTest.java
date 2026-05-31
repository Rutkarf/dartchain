package io.dartchain.backend.explorer.service;

import io.dartchain.backend.explorer.dto.ExplorerSearchResponse;
import io.dartchain.backend.service.BlockchainService;
import io.dartchain.backend.showcase.service.MarketChartService;
import io.dartchain.backend.service.BlockchainValidationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(MockitoExtension.class)
class ExplorerSearchServiceTest {

    @Mock
    private BlockchainValidationService validationService;

    @Mock
    private MarketChartService marketChartService;

    private ExplorerSearchService explorerSearchService;

    @BeforeEach
    void setUp() {
        BlockchainService blockchainService = new BlockchainService(validationService, marketChartService);
        explorerSearchService = new ExplorerSearchService(blockchainService);
    }

    @Test
    void searchReturnsGenesisBlockByIndex() {
        ExplorerSearchResponse response = explorerSearchService.search("0");

        assertThat(response.results())
                .isNotEmpty()
                .anyMatch(result -> "BLOCK".equals(result.kind()) && Integer.valueOf(0).equals(result.blockIndex()));
    }

    @Test
    void searchReturnsEmptyForBlankQuery() {
        ExplorerSearchResponse response = explorerSearchService.search("   ");

        assertThat(response.results()).isEmpty();
    }
}
