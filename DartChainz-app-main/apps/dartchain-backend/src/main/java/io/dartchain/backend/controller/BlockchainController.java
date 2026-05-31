package io.dartchain.backend.controller;

import io.dartchain.backend.dto.StatsResponse;
import io.dartchain.backend.model.Block;
import io.dartchain.backend.model.Transaction;
import io.dartchain.backend.service.BlockchainService;
import io.dartchain.backend.service.ExchangeService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/blockchain")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class BlockchainController {

    private final BlockchainService blockchainService;
    private final ExchangeService exchangeService;

    @GetMapping("/balance/{address}")
    public Map<String, Object> getBalance(@PathVariable String address) {
        BigDecimal chainBalance = blockchainService.getBalance(address);
        BigDecimal effectiveBalance = exchangeService.getEffectiveNativeBalance(address);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("address", address);
        response.put("balance", effectiveBalance);
        response.put("chainBalance", chainBalance);
        response.put("testnetAdjusted", effectiveBalance.compareTo(chainBalance) != 0);
        return response;
    }

    @GetMapping("/chain")
    public List<Block> getChain() {
        return blockchainService.getChain();
    }

    /** Alias frontend : `/api/blockchain/blocks` */
    @GetMapping("/blocks")
    public List<Block> getBlocks() {
        return blockchainService.getBlocks();
    }

    /** Alias frontend : `/api/blockchain/blocks/latest` */
    @GetMapping("/blocks/latest")
    public Block getLatestBlock() {
        return blockchainService.getLatestBlock();
    }

    /** Alias frontend : `/api/blockchain/stats` */
    @GetMapping("/stats")
    public StatsResponse getStats() {
        return blockchainService.getStats();
    }

    @GetMapping("/pending")
    public List<Transaction> getPendingTransactions() {
        return blockchainService.getPendingTransactions();
    }

    @PostMapping("/mine/{minerAddress}")
    public Block minePendingTransactions(@PathVariable String minerAddress) {
        return blockchainService.minePendingTransactions(minerAddress);
    }
}