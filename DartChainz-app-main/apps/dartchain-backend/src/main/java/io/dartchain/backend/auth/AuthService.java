package io.dartchain.backend.auth;

import io.dartchain.backend.auth.dto.AuthResponse;
import io.dartchain.backend.auth.store.SessionStore;
import io.dartchain.backend.auth.store.UserAccountStore;
import io.dartchain.backend.auth.dto.LinkWalletRequest;
import io.dartchain.backend.auth.dto.LoginRequest;
import io.dartchain.backend.auth.dto.RegisterRequest;
import io.dartchain.backend.auth.dto.UserProfileResponse;
import io.dartchain.backend.utils.CryptoUtils;
import io.dartchain.backend.utils.WalletValidator;
import org.springframework.stereotype.Service;

import java.util.UUID;
import java.util.regex.Pattern;

@Service
public class AuthService {

    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");

    private final UserAccountStore userAccountStore;
    private final SessionStore sessionStore;

    public AuthService(UserAccountStore userAccountStore, SessionStore sessionStore) {
        this.userAccountStore = userAccountStore;
        this.sessionStore = sessionStore;
    }

    public AuthResponse register(RegisterRequest request) {
        String username = request.username().trim();
        String email = request.email().trim();
        String password = request.password();

        if (userAccountStore.findByUsername(username).isPresent()) {
            throw new AuthException(409, "Ce nom d'utilisateur est déjà utilisé");
        }

        if (userAccountStore.findByEmail(email).isPresent()) {
            throw new AuthException(409, "Cet email est déjà utilisé");
        }

        String salt = PasswordHasher.generateSalt();
        UserAccount account = new UserAccount(
                UUID.randomUUID().toString(),
                username,
                email,
                PasswordHasher.hash(password, salt),
                salt,
                System.currentTimeMillis()
        );

        userAccountStore.create(account);
        return buildAuthResponse(account);
    }

    public AuthResponse login(LoginRequest request) {
        String identifier = request.identifier().trim();
        UserAccount account = resolveAccount(identifier)
                .orElseThrow(() -> new AuthException(401, "Identifiants invalides"));

        if (!PasswordHasher.verify(request.password(), account.getPasswordSalt(), account.getPasswordHash())) {
            throw new AuthException(401, "Identifiants invalides");
        }

        return buildAuthResponse(account);
    }

    public UserProfileResponse me(String token) {
        UserAccount account = resolveAccountFromToken(token)
                .orElseThrow(() -> new AuthException(401, "Session invalide ou expirée"));
        return toProfile(account);
    }

    public void logout(String token) {
        sessionStore.revoke(extractToken(token));
    }

    public UserProfileResponse linkWallet(String token, LinkWalletRequest request) {
        UserAccount account = resolveAccountFromToken(token)
                .orElseThrow(() -> new AuthException(401, "Session invalide ou expirée"));

        String walletAddress = WalletValidator.normalize(request.walletAddress());
        String publicKey = request.publicKey().trim();

        if (!WalletValidator.isValidBlockchainAddress(walletAddress)) {
            throw new AuthException(400, "Adresse wallet invalide");
        }

        if (publicKey.isBlank()) {
            throw new AuthException(400, "Clé publique requise");
        }

        try {
            String derivedAddress = CryptoUtils.addressFromPublicKey(
                    CryptoUtils.publicKeyFromBase64(publicKey)
            );
            if (!derivedAddress.equals(walletAddress)) {
                throw new AuthException(400, "La clé publique ne correspond pas à l'adresse wallet");
            }
        } catch (RuntimeException exception) {
            throw new AuthException(400, "Clé publique invalide");
        }

        userAccountStore.findByWalletAddress(walletAddress).ifPresent(existing -> {
            if (!existing.getId().equals(account.getId())) {
                throw new AuthException(409, "Ce wallet est déjà lié à un autre compte");
            }
        });

        UserAccount updated = userAccountStore.updateWallet(account.getId(), walletAddress, publicKey);
        return toProfile(updated);
    }

    public UserAccount requireAuthenticatedAccount(String token) {
        return resolveAccountFromToken(token)
                .orElseThrow(() -> new AuthException(401, "Session invalide ou expirée"));
    }

    public void ensureWalletOwnership(UserAccount account, String walletAddress) {
        if (account.getWalletAddress() == null || account.getWalletAddress().isBlank()) {
            throw new AuthException(403, "Aucun wallet lié au compte. Liez un wallet avant de continuer.");
        }

        if (!account.getWalletAddress().equalsIgnoreCase(WalletValidator.normalize(walletAddress))) {
            throw new AuthException(403, "Ce wallet ne correspond pas à votre compte");
        }
    }

    private AuthResponse buildAuthResponse(UserAccount account) {
        String token = sessionStore.createSession(account.getId());
        return new AuthResponse(token, toProfile(account));
    }

    private java.util.Optional<UserAccount> resolveAccountFromToken(String rawToken) {
        String token = extractToken(rawToken);
        return sessionStore.resolveUserId(token)
                .flatMap(userAccountStore::findById);
    }

    private java.util.Optional<UserAccount> resolveAccount(String identifier) {
        if (EMAIL_PATTERN.matcher(identifier).matches()) {
            return userAccountStore.findByEmail(identifier);
        }
        return userAccountStore.findByUsername(identifier);
    }

    private UserProfileResponse toProfile(UserAccount account) {
        return new UserProfileResponse(
                account.getId(),
                account.getUsername(),
                account.getEmail(),
                account.getCreatedAt(),
                account.getWalletAddress(),
                account.getWalletPublicKey()
        );
    }

    public static String extractToken(String authorizationHeader) {
        if (authorizationHeader == null || authorizationHeader.isBlank()) {
            return "";
        }

        String value = authorizationHeader.trim();
        if (value.regionMatches(true, 0, "Bearer ", 0, 7)) {
            return value.substring(7).trim();
        }

        return value;
    }
}
