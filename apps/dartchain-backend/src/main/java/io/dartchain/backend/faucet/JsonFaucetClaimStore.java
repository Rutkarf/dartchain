package io.dartchain.backend.faucet;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.dartchain.backend.faucet.store.FaucetClaimStore;
import io.dartchain.backend.model.FaucetClaim;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

@Component
@ConditionalOnProperty(name = "dartchain.persistence.mode", havingValue = "memory", matchIfMissing = true)
public class JsonFaucetClaimStore implements FaucetClaimStore {

    private static final Logger log = LoggerFactory.getLogger(JsonFaucetClaimStore.class);

    private final ObjectMapper objectMapper;
    private final Path storePath;
    private final List<FaucetClaim> claims = new ArrayList<>();

    public JsonFaucetClaimStore(
            ObjectMapper objectMapper,
            @Value("${faucet.claims.path:data/faucet-claims.json}") String storePath
    ) {
        this.objectMapper = objectMapper;
        this.storePath = Path.of(storePath);
    }

    @PostConstruct
    public void loadFromDisk() {
        if (!Files.exists(storePath)) {
            return;
        }

        try {
            FaucetClaimSnapshot snapshot = objectMapper.readValue(
                    Files.readString(storePath),
                    FaucetClaimSnapshot.class
            );
            synchronized (claims) {
                claims.clear();
                claims.addAll(snapshot.getClaims());
            }
        } catch (IOException exception) {
            throw new IllegalStateException("Unable to load faucet claims from " + storePath, exception);
        }
    }

    @Override
    public synchronized FaucetClaim save(FaucetClaim claim) {
        claims.add(cloneClaim(claim));
        persistToDisk();
        return cloneClaim(claim);
    }

    @Override
    public synchronized Optional<FaucetClaim> findLastClaimByWallet(String walletAddress) {
        if (walletAddress == null || walletAddress.isBlank()) {
            return Optional.empty();
        }

        return claims.stream()
                .filter(claim -> walletAddress.equalsIgnoreCase(claim.getWalletAddress()))
                .max(Comparator.comparingLong(FaucetClaim::getClaimedAt))
                .map(this::cloneClaim);
    }

    @Override
    public synchronized List<FaucetClaim> findAllOrderByClaimedAtDesc() {
        return claims.stream()
                .sorted(Comparator.comparingLong(FaucetClaim::getClaimedAt).reversed())
                .map(this::cloneClaim)
                .toList();
    }

    @Override
    public synchronized List<FaucetClaim> findAllByWalletOrderByClaimedAtDesc(String walletAddress) {
        if (walletAddress == null || walletAddress.isBlank()) {
            return List.of();
        }

        return claims.stream()
                .filter(claim -> walletAddress.equalsIgnoreCase(claim.getWalletAddress()))
                .sorted(Comparator.comparingLong(FaucetClaim::getClaimedAt).reversed())
                .map(this::cloneClaim)
                .toList();
    }

    private void persistToDisk() {
        try {
            if (storePath.getParent() != null) {
                Files.createDirectories(storePath.getParent());
            }

            FaucetClaimSnapshot snapshot = new FaucetClaimSnapshot();
            snapshot.setClaims(claims.stream().map(this::cloneClaim).toList());
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(storePath.toFile(), snapshot);
        } catch (IOException exception) {
            log.warn("Unable to persist faucet claims to {}: {}", storePath, exception.getMessage());
        }
    }

    private FaucetClaim cloneClaim(FaucetClaim source) {
        return objectMapper.convertValue(source, FaucetClaim.class);
    }
}
