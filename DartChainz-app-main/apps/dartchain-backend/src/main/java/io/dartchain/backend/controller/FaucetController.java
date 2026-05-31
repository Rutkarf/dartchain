package io.dartchain.backend.controller;

import io.dartchain.backend.dto.FaucetClaimRequest;
import io.dartchain.backend.dto.FaucetClaimResponse;
import io.dartchain.backend.dto.FaucetStateResponse;
import io.dartchain.backend.model.FaucetClaim;
import io.dartchain.backend.service.FaucetService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/faucet")
public class FaucetController {

    private final FaucetService faucetService;

    public FaucetController(FaucetService faucetService) {
        this.faucetService = faucetService;
    }

    @GetMapping("/state/{walletAddress}")
    public FaucetStateResponse getState(@PathVariable String walletAddress) {
        return faucetService.getState(walletAddress);
    }

    @PostMapping("/claim")
    @ResponseStatus(HttpStatus.CREATED)
    public FaucetClaimResponse claim(@Valid @RequestBody FaucetClaimRequest request) {
        return faucetService.claim(request);
    }

    @GetMapping("/claims")
    public List<FaucetClaim> getAllClaims() {
        return faucetService.getAllClaims();
    }
}