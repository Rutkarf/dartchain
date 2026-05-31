package io.dartchain.backend.controller;

import io.dartchain.backend.dto.StatsResponse;
import io.dartchain.backend.service.BlockchainService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class StatsController {

    private final BlockchainService blockchainService;

    public StatsController(BlockchainService blockchainService) {
        this.blockchainService = blockchainService;
    }

    @GetMapping("/api/stats")
    public StatsResponse getStats() {
        return blockchainService.getStats();
    }
}