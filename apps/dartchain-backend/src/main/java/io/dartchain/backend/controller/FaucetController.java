package io.dartchain.backend.controller;

import io.dartchain.backend.auth.AuthService;
import io.dartchain.backend.auth.UserAccount;
import io.dartchain.backend.dto.FaucetClaimRequest;
import io.dartchain.backend.dto.FaucetClaimResponse;
import io.dartchain.backend.dto.FaucetConfigResponse;
import io.dartchain.backend.dto.FaucetStateResponse;
import io.dartchain.backend.model.FaucetClaim;
import io.dartchain.backend.product.ProductFeatureService;
import io.dartchain.backend.service.FaucetService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/faucet")
public class FaucetController {

    private final FaucetService faucetService;
    private final AuthService authService;
    private final ProductFeatureService productFeatures;

    public FaucetController(
            FaucetService faucetService,
            AuthService authService,
            ProductFeatureService productFeatures
    ) {
        this.faucetService = faucetService;
        this.authService = authService;
        this.productFeatures = productFeatures;
    }

    @GetMapping("/config")
    public FaucetConfigResponse getConfig() {
        productFeatures.requireFaucet();
        return faucetService.getConfig();
    }

    @GetMapping("/state/{walletAddress}")
    public FaucetStateResponse getState(@PathVariable String walletAddress) {
        productFeatures.requireFaucet();
        return faucetService.getState(walletAddress);
    }

    @PostMapping("/claim")
    @ResponseStatus(HttpStatus.CREATED)
    public FaucetClaimResponse claim(
            @Valid @RequestBody FaucetClaimRequest request,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        productFeatures.requireFaucet();
        return faucetService.claim(request, authorization);
    }

    @GetMapping("/claims")
    public List<FaucetClaim> getClaims(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestParam(value = "walletAddress", required = false) String walletAddress,
            @RequestParam(value = "offset", defaultValue = "0") int offset,
            @RequestParam(value = "limit", defaultValue = "50") int limit
    ) {
        productFeatures.requireFaucet();
        UserAccount account = authService.requireAuthenticatedAccount(authorization);
        String resolvedWallet = resolveClaimsWallet(account, walletAddress);
        if (resolvedWallet == null) {
            return List.of();
        }
        return faucetService.getClaimsForWallet(resolvedWallet, offset, limit);
    }

    private String resolveClaimsWallet(UserAccount account, String requestedWallet) {
        if (requestedWallet != null && !requestedWallet.isBlank()) {
            authService.ensureWalletOwnership(account, requestedWallet);
            return requestedWallet;
        }

        if (account.getWalletAddress() == null || account.getWalletAddress().isBlank()) {
            return null;
        }

        return account.getWalletAddress();
    }
}