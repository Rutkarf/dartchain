package io.dartchain.backend.showcase.service;

import io.dartchain.backend.showcase.dto.ChartResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class MarketChartServiceTest {

    private MarketChartService marketChartService;

    @BeforeEach
    void setUp() {
        marketChartService = new MarketChartService();
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
    void recordBlockMined_updatesPrice() {
        ChartResponse before = marketChartService.getChart("DART-R4V3", "1h");
        marketChartService.recordBlockMined();
        ChartResponse after = marketChartService.getChart("DART-R4V3", "1h");

        assertThat(after.points()).isNotEmpty();
        assertThat(after.volume()).isNotEqualTo(before.volume());
    }
}
