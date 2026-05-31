package io.dartchain.backend.controller;

import io.dartchain.backend.dto.WalletCreateResponse;
import io.dartchain.backend.model.Wallet;
import io.dartchain.backend.service.ExchangeService;
import io.dartchain.backend.service.WalletService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/wallets")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class WalletController {

    private final WalletService walletService;
    private final ExchangeService exchangeService;

    @PostMapping("/create")
    public WalletCreateResponse createWallet() {
        Wallet wallet = walletService.createWallet();
        boolean seeded = exchangeService.seedWelcomeCredits(wallet.getAddress());

        return new WalletCreateResponse(
                wallet,
                seeded,
                seeded
                        ? "Crédits testnet : 0,001 BTC + 10 R4V3 (simulateur)."
                        : null
        );
    }
}