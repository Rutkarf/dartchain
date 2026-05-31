package io.dartchain.backend.service;

import io.dartchain.backend.config.FaucetConfig;
import io.dartchain.backend.dto.FaucetClaimRequest;
import io.dartchain.backend.dto.FaucetClaimResponse;
import io.dartchain.backend.dto.FaucetStateResponse;
import io.dartchain.backend.exception.FaucetException;
import io.dartchain.backend.model.FaucetClaim;
import io.dartchain.backend.utils.FaucetTimeUtils;
import io.dartchain.backend.utils.HashUtils;
import io.dartchain.backend.utils.WalletValidator;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
public class FaucetServiceImpl implements FaucetService {

    private final List<FaucetClaim> claims = new ArrayList<>();
    private final FaucetConfig faucetConfig;

    public FaucetServiceImpl(FaucetConfig faucetConfig) {
        this.faucetConfig = faucetConfig;
    }

    @Override
    public synchronized FaucetStateResponse getState(String walletAddress) {
        String normalizedWallet = WalletValidator.normalize(walletAddress);

        if (!WalletValidator.isValid(normalizedWallet, faucetConfig.getWalletPrefix())) {
            throw new FaucetException("Invalid wallet address");
        }

        FaucetClaim lastClaim = findLastClaimByWallet(normalizedWallet);

        FaucetStateResponse response = new FaucetStateResponse();
        response.setWalletAddress(normalizedWallet);

        if (lastClaim == null) {
            response.setEligible(true);
            response.setCooldownSeconds(0);
            response.setNextEligibleAt(null);
            response.setLastClaimAmount(null);
            response.setLastClaimAt(null);
            return response;
        }

        long now = System.currentTimeMillis();
        long cooldownSeconds = FaucetTimeUtils.remainingCooldownSeconds(now, lastClaim.getNextEligibleAt());

        response.setEligible(cooldownSeconds == 0);
        response.setCooldownSeconds(cooldownSeconds);
        response.setNextEligibleAt(FaucetTimeUtils.toIso(lastClaim.getNextEligibleAt()));
        response.setLastClaimAmount(lastClaim.getAmount().toPlainString());
        response.setLastClaimAt(FaucetTimeUtils.toIso(lastClaim.getClaimedAt()));

        return response;
    }

    @Override
    public synchronized FaucetClaimResponse claim(FaucetClaimRequest request) {
        if (request == null) {
            throw new FaucetException("Claim request is required");
        }

        String normalizedWallet = WalletValidator.normalize(request.getWalletAddress());

        if (!WalletValidator.isValid(normalizedWallet, faucetConfig.getWalletPrefix())) {
            throw new FaucetException("Invalid wallet address");
        }

        FaucetStateResponse state = getState(normalizedWallet);
        if (!state.isEligible()) {
            throw new FaucetException(
                    "Claim not allowed yet. Next eligible at: " + state.getNextEligibleAt()
            );
        }

        long now = System.currentTimeMillis();
        long nextEligibleAt = now + faucetConfig.getCooldownDuration().toMillis();
        BigDecimal amount = faucetConfig.getAmount();

        FaucetClaim claim = new FaucetClaim();
        claim.setId(UUID.randomUUID().toString());
        claim.setWalletAddress(normalizedWallet);
        claim.setAmount(amount);
        claim.setClaimedAt(now);
        claim.setNextEligibleAt(nextEligibleAt);
        claim.setClientId(request.getClientId());
        claim.setTxHash(generateTxHash(normalizedWallet, now, amount));

        claims.add(claim);

        FaucetClaimResponse response = new FaucetClaimResponse();
        response.setSuccess(true);
        response.setMessage("Faucet claim accepted");
        response.setWalletAddress(claim.getWalletAddress());
        response.setAmount(claim.getAmount().toPlainString());
        response.setClaimedAt(FaucetTimeUtils.toIso(claim.getClaimedAt()));
        response.setNextEligibleAt(FaucetTimeUtils.toIso(claim.getNextEligibleAt()));
        response.setCooldownSeconds(FaucetTimeUtils.remainingCooldownSeconds(now, claim.getNextEligibleAt()));
        response.setTxHash(claim.getTxHash());

        return response;
    }

    @Override
    public synchronized List<FaucetClaim> getAllClaims() {
        return claims.stream()
                .sorted(Comparator.comparingLong(FaucetClaim::getClaimedAt).reversed())
                .toList();
    }

    private FaucetClaim findLastClaimByWallet(String walletAddress) {
        return claims.stream()
                .filter(claim -> walletAddress.equalsIgnoreCase(claim.getWalletAddress()))
                .max(Comparator.comparingLong(FaucetClaim::getClaimedAt))
                .orElse(null);
    }

    private String generateTxHash(String walletAddress, long timestamp, BigDecimal amount) {
        String raw = walletAddress + "|" + timestamp + "|" + amount.toPlainString() + "|" + UUID.randomUUID();
        return HashUtils.sha256(raw);
    }
}