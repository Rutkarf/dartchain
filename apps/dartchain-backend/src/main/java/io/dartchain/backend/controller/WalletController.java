package io.dartchain.backend.controller;

import io.dartchain.backend.dto.WalletPublicView;
import io.dartchain.backend.dto.WalletVerifyRequest;
import io.dartchain.backend.dto.WalletVerifyResponse;
import io.dartchain.backend.model.Wallet;
import io.dartchain.backend.service.WalletService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/wallets")
@RequiredArgsConstructor
public class WalletController {

    private final WalletService walletService;

    /** Phase M — retourne uniquement address + publicKey (génération côté client). */
    @PostMapping("/create-client")
    public WalletPublicView createClientWallet(@Valid @RequestBody WalletVerifyRequest request) {
        WalletVerifyResponse verified = walletService.verifyWallet(
                request.getAddress(),
                request.getPublicKey()
        );

        if (!verified.valid()) {
            throw new IllegalArgumentException("address et publicKey ne correspondent pas");
        }

        Wallet wallet = new Wallet();
        wallet.setAddress(verified.address());
        wallet.setPublicKey(verified.publicKey());
        wallet.setPrivateKey(null);
        wallet.setBalance(java.math.BigDecimal.ZERO);

        return walletService.toPublicView(wallet);
    }

    /** Phase M — vérifie qu'une adresse dérive bien de la clé publique. */
    @PostMapping("/verify")
    public WalletVerifyResponse verifyWallet(@Valid @RequestBody WalletVerifyRequest request) {
        WalletVerifyResponse response = walletService.verifyWallet(
                request.getAddress(),
                request.getPublicKey()
        );

        if (!response.valid()) {
            throw new IllegalArgumentException("address et publicKey ne correspondent pas");
        }

        return response;
    }
}
