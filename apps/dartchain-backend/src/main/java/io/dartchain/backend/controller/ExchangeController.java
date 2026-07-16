package io.dartchain.backend.controller;

import io.dartchain.backend.auth.security.RoleAuthorizationService;
import io.dartchain.backend.dto.ExchangePanelResponse;
import io.dartchain.backend.dto.ExchangeSwapRequest;
import io.dartchain.backend.dto.ExchangeSwapResponse;
import io.dartchain.backend.service.ExchangeService;
import io.dartchain.backend.web.RequestClientInfo;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/exchange-panel")
public class ExchangeController {

    private final ExchangeService exchangeService;
    private final RoleAuthorizationService roleAuthorizationService;

    public ExchangeController(
            ExchangeService exchangeService,
            RoleAuthorizationService roleAuthorizationService
    ) {
        this.exchangeService = exchangeService;
        this.roleAuthorizationService = roleAuthorizationService;
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
    public ExchangeSwapResponse swap(
            @RequestBody ExchangeSwapRequest request,
            @RequestHeader(value = "Authorization", required = false) String authorization,
            HttpServletRequest httpRequest
    ) {
        String detail = request != null ? request.walletAddress() : null;
        String ip = RequestClientInfo.clientIp(httpRequest);
        roleAuthorizationService.authorizeMutation(authorization, "exchange.swap", detail, ip);
        return exchangeService.swap(request, authorization);
    }
}
