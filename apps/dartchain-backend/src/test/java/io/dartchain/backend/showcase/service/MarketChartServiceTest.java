package io.dartchain.backend.showcase.service;

import io.dartchain.backend.blockchain.BlockchainSnapshot;
import io.dartchain.backend.blockchain.store.BlockchainStateStore;
import io.dartchain.backend.model.Block;
import io.dartchain.backend.model.Transaction;
import io.dartchain.backend.showcase.dto.ChartResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class MarketChartServiceTest {

    private MarketChartService marketChartService;
    private BlockchainStateStore blockchainStateStore;

    @BeforeEach
    void setUp() {
        blockchainStateStore = mock(BlockchainStateStore.class);
        when(blockchainStateStore.load()).thenReturn(emptySnapshot());
        marketChartService = new MarketChartService(blockchainStateStore);
        marketChartService.seedHistory();
    }

    @Test
    void getChart_returnsNormalizedPoints() {
        ChartResponse chart = marketChartService.getChart("DART-R4V3", "24h");

        assertThat(chart.points()).isNotEmpty();
        assertThat(chart.currentPrice()).isNotBlank();
        assertThat(chart.points()).allMatch(point -> point.v() >= 0 && point.v() <= 100);
    }

    @Test
    void getChart_returnsZeroVolumeWhenNoOnChainActivity() {
        ChartResponse chart = marketChartService.getChart("R4V3-CHF", "24h");

        assertThat(chart.volume()).isEqualTo("0");
    }

    @Test
    void getChart_sumsNonSystemTransactionsInRange() {
        long now = System.currentTimeMillis();
        Block block = new Block(
                1,
                now,
                List.of(
                        new Transaction(
                                "tx-1",
                                "hash-1",
                                "alice",
                                "bob",
                                new BigDecimal("500"),
                                now,
                                "sig",
                                false,
                                null,
                                "confirmed"
                        )
                ),
                "prev",
                "hash-block",
                0,
                4
        );

        BlockchainSnapshot snapshot = new BlockchainSnapshot();
        snapshot.setBlocks(List.of(block));
        when(blockchainStateStore.load()).thenReturn(snapshot);

        ChartResponse chart = marketChartService.getChart("R4V3-CHF", "24h");

        assertThat(chart.volume()).isEqualTo("500");
    }

    @Test
    void recordBlockMined_updatesPriceWithoutFakeVolumeSeed() {
        ChartResponse before = marketChartService.getChart("DART-R4V3", "1h");
        marketChartService.recordBlockMined();
        ChartResponse after = marketChartService.getChart("DART-R4V3", "1h");

        assertThat(after.points()).isNotEmpty();
        assertThat(after.volume()).isEqualTo("0");
        assertThat(after.currentPrice()).isNotEqualTo(before.currentPrice());
    }

    private static BlockchainSnapshot emptySnapshot() {
        BlockchainSnapshot snapshot = new BlockchainSnapshot();
        snapshot.setBlocks(List.of());
        snapshot.setPendingPool(List.of());
        return snapshot;
    }
}
