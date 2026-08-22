package io.dartchain.backend.faucet.application;

import io.dartchain.backend.auth.AuthService;
import io.dartchain.backend.auth.UserAccount;
import io.dartchain.backend.config.FaucetConfig;
import io.dartchain.backend.faucet.dto.FaucetClaimRequest;
import io.dartchain.backend.faucet.dto.FaucetClaimResponse;
import io.dartchain.backend.faucet.dto.FaucetConfigResponse;
import io.dartchain.backend.faucet.dto.FaucetStateResponse;
import io.dartchain.backend.shared.exception.FaucetException;
import io.dartchain.backend.faucet.store.FaucetClaimStore;
import io.dartchain.backend.faucet.store.FaucetPendingBalanceStore;
import io.dartchain.backend.faucet.model.FaucetClaim;
import io.dartchain.backend.blockchain.model.Transaction;
import io.dartchain.backend.ops.ApplicationMetricsCollector;
import io.dartchain.backend.quests.application.QuestService;
import io.dartchain.backend.utils.FaucetTimeUtils;
import io.dartchain.backend.shared.utils.WalletValidator;
import io.dartchain.backend.blockchain.application.BlockchainService;
import io.dartchain.backend.faucet.application.FaucetService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
public class FaucetServiceImpl implements FaucetService {

    private final FaucetClaimStore claimStore;
    private final FaucetPendingBalanceStore pendingBalanceStore;
    private final FaucetConfig faucetConfig;
    private final BlockchainService blockchainService;
    private final AuthService authService;
    private final QuestService questService;
    private final ApplicationMetricsCollector metricsCollector;

    public FaucetServiceImpl(
            FaucetConfig faucetConfig,
            BlockchainService blockchainService,
            AuthService authService,
            FaucetClaimStore claimStore,
            FaucetPendingBalanceStore pendingBalanceStore
    ) {
        this(faucetConfig, blockchainService, authService, claimStore, pendingBalanceStore, null, null);
    }

    public FaucetServiceImpl(
            FaucetConfig faucetConfig,
            BlockchainService blockchainService,
            AuthService authService,
            FaucetClaimStore claimStore,
            FaucetPendingBalanceStore pendingBalanceStore,
            QuestService questService
    ) {
        this(faucetConfig, blockchainService, authService, claimStore, pendingBalanceStore, questService, null);
    }

    @Autowired
    public FaucetServiceImpl(
            FaucetConfig faucetConfig,
            BlockchainService blockchainService,
            AuthService authService,
            FaucetClaimStore claimStore,
            FaucetPendingBalanceStore pendingBalanceStore,
            @Lazy QuestService questService,
            ApplicationMetricsCollector metricsCollector
    ) {
        this.claimStore = claimStore;
        this.pendingBalanceStore = pendingBalanceStore;
        this.faucetConfig = faucetConfig;
        this.blockchainService = blockchainService;
        this.authService = authService;
        this.questService = questService;
        this.metricsCollector = metricsCollector;
    }

    @Override
    public synchronized FaucetStateResponse getState(String walletAddress) {
        String normalizedWallet = normalizeWallet(walletAddress);
        return buildState(normalizedWallet);
    }

    @Override
    public synchronized FaucetClaimResponse claim(FaucetClaimRequest request, String authorizationHeader) {
        if (request == null) {
            throw new FaucetException("Claim request is required");
        }

        UserAccount account = authService.requireAuthenticatedAccount(authorizationHeader);

        String normalizedWallet = normalizeWallet(request.getWalletAddress());
        authService.ensureWalletOwnership(account, normalizedWallet);

        FaucetStateResponse state = buildState(normalizedWallet);
        if (!state.isEligible()) {
            throw new FaucetException(
                    "Claim not allowed yet. Next eligible at: " + state.getNextEligibleAt()
            );
        }

        BigDecimal pending = pendingBalanceStore.get(normalizedWallet);
        if (pending.compareTo(BigDecimal.ZERO) <= 0) {
            throw new FaucetException("Aucune pièce M4T3R à claim — ramassez des pièces d'abord");
        }

        BigDecimal requested = resolveClaimAmount(request);
        BigDecimal amount = requested.min(pending).min(BigDecimal.ONE);
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new FaucetException("Montant claim invalide");
        }

        BigDecimal debited = pendingBalanceStore.debit(normalizedWallet, amount);
        if (debited.compareTo(BigDecimal.ZERO) <= 0) {
            throw new FaucetException("Solde faucet pending insuffisant");
        }

        long now = System.currentTimeMillis();
        long nextEligibleAt = now + faucetConfig.getCooldownDuration().toMillis();

        // Mempool only — le bloc est créé au mine manuel / mine mempool.
        Transaction pendingTx = blockchainService.enqueueSystemCredit(
                normalizedWallet,
                debited,
                "FAUCET_CLAIM"
        );

        FaucetClaim claim = new FaucetClaim();
        claim.setId(UUID.randomUUID().toString());
        claim.setWalletAddress(normalizedWallet);
        claim.setAmount(debited);
        claim.setClaimedAt(now);
        claim.setNextEligibleAt(nextEligibleAt);
        claim.setClientId(request.getClientId());
        claim.setTxHash(pendingTx.getHash());

        claimStore.save(claim);

        if (metricsCollector != null) {
            metricsCollector.recordFaucetClaim(normalizedWallet);
        }

        if (questService != null) {
            questService.completeFaucetClaimQuest(account.getId());
        }

        FaucetClaimResponse response = new FaucetClaimResponse();
        response.setSuccess(true);
        response.setMessage("Faucet claim placé dans le mempool — miner pour confirmer");
        response.setWalletAddress(claim.getWalletAddress());
        response.setAmount(claim.getAmount().toPlainString());
        response.setClaimedAt(FaucetTimeUtils.toIso(claim.getClaimedAt()));
        response.setNextEligibleAt(FaucetTimeUtils.toIso(claim.getNextEligibleAt()));
        response.setCooldownSeconds(FaucetTimeUtils.remainingCooldownSeconds(now, claim.getNextEligibleAt()));
        response.setTxHash(claim.getTxHash());

        return response;
    }

    @Override
    public synchronized List<FaucetClaim> getClaimsForWallet(String walletAddress) {
        return getClaimsForWallet(walletAddress, 0, Integer.MAX_VALUE);
    }

    @Override
    public synchronized List<FaucetClaim> getClaimsForWallet(String walletAddress, int offset, int limit) {
        String normalizedWallet = normalizeWallet(walletAddress);
        List<FaucetClaim> all = claimStore.findAllByWalletOrderByClaimedAtDesc(normalizedWallet);
        if (offset <= 0 && limit >= all.size()) {
            return all;
        }

        int safeOffset = Math.max(0, offset);
        int safeLimit = Math.max(1, limit);
        int end = Math.min(all.size(), safeOffset + safeLimit);
        if (safeOffset >= all.size()) {
            return List.of();
        }
        return all.subList(safeOffset, end);
    }

    @Override
    public FaucetConfigResponse getConfig() {
        FaucetConfigResponse response = new FaucetConfigResponse();
        response.setDefaultClaimAmount(faucetConfig.getAmount().toPlainString());
        response.setCooldownSeconds(faucetConfig.getCooldownSeconds());
        response.setWalletPrefix(faucetConfig.getWalletPrefix());
        response.setNativeToken("R4V3");
        response.setSmallestUnit("m4t3r");
        response.setMaxClaimAmount("1");
        return response;
    }

    private FaucetStateResponse buildState(String normalizedWallet) {
        FaucetClaim lastClaim = claimStore.findLastClaimByWallet(normalizedWallet).orElse(null);

        FaucetStateResponse response = new FaucetStateResponse();
        response.setWalletAddress(normalizedWallet);
        response.setDefaultClaimAmount(faucetConfig.getAmount().toPlainString());
        response.setConfigCooldownSeconds(faucetConfig.getCooldownSeconds());
        response.setPendingAmount(pendingBalanceStore.get(normalizedWallet).toPlainString());

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

    private BigDecimal resolveClaimAmount(FaucetClaimRequest request) {
        String rawAmount = request.getAmount();
        if (rawAmount != null && !rawAmount.isBlank()) {
            BigDecimal amount;
            try {
                amount = new BigDecimal(rawAmount.trim().replace(',', '.'));
            } catch (NumberFormatException exception) {
                throw new FaucetException("Montant faucet invalide");
            }

            if (amount.compareTo(BigDecimal.ZERO) <= 0) {
                throw new FaucetException("Le montant doit être supérieur à 0");
            }

            if (amount.compareTo(BigDecimal.ONE) > 0) {
                throw new FaucetException("Le montant dépasse le plafond faucet");
            }

            if (amount.scale() > 26) {
                throw new FaucetException("Précision maximale : 26 décimales (m4t3r)");
            }

            return amount;
        }

        return faucetConfig.getAmount();
    }

    private String normalizeWallet(String walletAddress) {
        String normalizedWallet = WalletValidator.normalize(walletAddress);

        if (!WalletValidator.isValidBlockchainAddress(normalizedWallet)) {
            throw new FaucetException("Invalid wallet address");
        }

        return normalizedWallet;
    }
}
