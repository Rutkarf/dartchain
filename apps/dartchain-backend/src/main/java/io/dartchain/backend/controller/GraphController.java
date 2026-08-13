package io.dartchain.backend.controller;

import io.dartchain.backend.showcase.dto.ChartResponse;
import io.dartchain.backend.showcase.service.MarketChartService;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@CrossOrigin
@RequestMapping("/api/graph")
public class GraphController {

    private final MarketChartService marketChartService;

    public GraphController(MarketChartService marketChartService) {
        this.marketChartService = marketChartService;
    }

    @GetMapping
    public ChartResponse getGraph(
            @RequestParam(defaultValue = "R4V3-CHF") String pair,
            @RequestParam(defaultValue = "24h") String range
    ) {
        return marketChartService.getChart(pair, range);
    }
}
