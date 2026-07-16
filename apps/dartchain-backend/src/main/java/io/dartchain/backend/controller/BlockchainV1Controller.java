package io.dartchain.backend.controller;

import io.dartchain.backend.config.ApiRoutes;
import io.dartchain.backend.dto.StatsResponse;
import io.dartchain.backend.model.Block;
import io.dartchain.backend.model.Transaction;
import io.dartchain.backend.service.BlockchainService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Phase AA — lectures blockchain versionnées.
 */
@RestController
@RequestMapping(ApiRoutes.BLOCKCHAIN_V1_PREFIX)
@RequiredArgsConstructor
public class BlockchainV1Controller {

    private final BlockchainService blockchainService;

    @GetMapping("/chain")
    public List<Block> getChain() {
        return blockchainService.getChain();
    }

    @GetMapping("/stats")
    public StatsResponse getStats() {
        return blockchainService.getStats();
    }

    @GetMapping("/valid")
    public boolean isChainValid() {
        return blockchainService.isChainValid();
    }

    @GetMapping("/blocks")
    public List<Block> getBlocks() {
        return blockchainService.getBlocks();
    }

    @GetMapping("/blocks/latest")
    public Block getLatestBlock() {
        return blockchainService.getLatestBlock();
    }

    @GetMapping("/pending")
    public List<Transaction> getPendingTransactions() {
        return blockchainService.getPendingTransactions();
    }
}
