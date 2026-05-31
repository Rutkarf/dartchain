package io.dartchain.backend.controller;

import io.dartchain.backend.dto.ExchangePanelResponse;
import io.dartchain.backend.dto.ExchangeSwapRequest;
import io.dartchain.backend.dto.ExchangeSwapResponse;
import io.dartchain.backend.service.ExchangeService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/exchange-panel")
public class ExchangeController {

    private final ExchangeService exchangeService;

    public ExchangeController(ExchangeService exchangeService) {
        this.exchangeService = exchangeService;
    }

    @GetMapping
    public ExchangePanelResponse getExchangePanel(
            @RequestParam(required = false) String walletAddress,
            @RequestParam(required = false) String fromToken,
            @RequestParam(required = false) String toToken
    ) {
        return exchangeService.getPanel(walletAddress, fromToken, toToken);
    }

    @PostMapping("/swap")
    public ExchangeSwapResponse swap(@RequestBody ExchangeSwapRequest request) {
        return exchangeService.swap(request);
    }
}