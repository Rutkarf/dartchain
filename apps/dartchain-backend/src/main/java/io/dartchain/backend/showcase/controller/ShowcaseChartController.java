package io.dartchain.backend.showcase.controller;

import io.dartchain.backend.showcase.dto.ChartResponse;
import io.dartchain.backend.showcase.service.MarketChartService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/showcase/chart")
public class ShowcaseChartController {

    private final MarketChartService marketChartService;

    public ShowcaseChartController(MarketChartService marketChartService) {
        this.marketChartService = marketChartService;
    }

    @GetMapping
    public ChartResponse getChart(
            @RequestParam(defaultValue = "R4V3-EUR") String pair,
            @RequestParam(defaultValue = "24h") String range
    ) {
        return marketChartService.getChart(pair, range);
    }
}
