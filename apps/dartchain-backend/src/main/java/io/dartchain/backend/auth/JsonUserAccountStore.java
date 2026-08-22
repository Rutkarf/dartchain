package io.dartchain.backend.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.dartchain.backend.auth.store.UserAccountStore;
import io.dartchain.backend.shared.utils.WalletValidator;
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
import java.util.List;
import java.util.Optional;

@Component
@ConditionalOnProperty(name = "dartchain.persistence.mode", havingValue = "memory", matchIfMissing = true)
public class JsonUserAccountStore implements UserAccountStore {

    private static final Logger log = LoggerFactory.getLogger(JsonUserAccountStore.class);

    private final ObjectMapper objectMapper;
    private final Path storePath;
    private final List<UserAccount> users = new ArrayList<>();

    public JsonUserAccountStore(
            ObjectMapper objectMapper,
            @Value("${auth.users.path:data/auth-users.json}") String storePath
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
            AuthUserSnapshot snapshot = objectMapper.readValue(
                    Files.readString(storePath),
                    AuthUserSnapshot.class
            );
            synchronized (users) {
                users.clear();
                users.addAll(snapshot.getUsers());
            }
        } catch (IOException exception) {
            throw new IllegalStateException("Unable to load auth users from " + storePath, exception);
        }
    }

    @Override
    public synchronized Optional<UserAccount> findById(String id) {
        return users.stream()
                .filter(user -> user.getId().equals(id))
                .findFirst();
    }

    @Override
    public synchronized Optional<UserAccount> findByUsername(String username) {
        String normalized = AuthNormalizer.normalizeUsername(username);
        return users.stream()
                .filter(user -> AuthNormalizer.normalizeUsername(user.getUsername()).equals(normalized))
                .findFirst();
    }

    @Override
    public synchronized Optional<UserAccount> findByEmail(String email) {
        String normalized = AuthNormalizer.normalizeEmail(email);
        return users.stream()
                .filter(user -> AuthNormalizer.normalizeEmail(user.getEmail()).equals(normalized))
                .findFirst();
    }

    @Override
    public synchronized Optional<UserAccount> findByWalletAddress(String walletAddress) {
        String normalized = WalletValidator.normalize(walletAddress);
        if (normalized == null || normalized.isBlank()) {
            return Optional.empty();
        }

        return users.stream()
                .filter(user -> normalized.equalsIgnoreCase(user.getWalletAddress()))
                .findFirst();
    }

    @Override
    public synchronized UserAccount updateWallet(String userId, String walletAddress, String publicKey) {
        UserAccount account = findById(userId)
                .orElseThrow(() -> new AuthException(404, "Utilisateur introuvable"));

        account.setWalletAddress(walletAddress);
        account.setWalletPublicKey(publicKey);
        persist();
        return account;
    }

    @Override
    public synchronized UserAccount updatePassword(String userId, String passwordHash) {
        UserAccount account = findById(userId)
                .orElseThrow(() -> new AuthException(404, "Utilisateur introuvable"));

        account.setPasswordHash(passwordHash);
        account.setPasswordSalt("");
        persist();
        return account;
    }

    @Override
    public synchronized UserAccount create(UserAccount account) {
        users.add(account);
        persist();
        return account;
    }

    private synchronized void persist() {
        try {
            Files.createDirectories(storePath.getParent());

            AuthUserSnapshot snapshot = new AuthUserSnapshot();
            snapshot.setUsers(List.copyOf(users));

            objectMapper.writerWithDefaultPrettyPrinter().writeValue(storePath.toFile(), snapshot);
        } catch (IOException exception) {
            log.warn("Unable to persist auth users to {}: {}", storePath, exception.getMessage());
        }
    }

}
