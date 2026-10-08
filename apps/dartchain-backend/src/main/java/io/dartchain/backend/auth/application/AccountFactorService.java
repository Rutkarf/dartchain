package io.dartchain.backend.auth.application;

import io.dartchain.backend.auth.mail.AuthMailer;
import io.dartchain.backend.auth.model.UserAccount;
import io.dartchain.backend.auth.security.TotpAuthenticator;
import io.dartchain.backend.auth.store.UserAccountStore;
import io.dartchain.backend.auth.dto.TotpSetupResponse;
import io.dartchain.backend.auth.jwt.NativeJwtService;
import io.dartchain.backend.config.AuthProperties;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AccountFactorService {

    private static final long EMAIL_TTL_MS = 15 * 60 * 1000L;
    private static final int MAX_ATTEMPTS = 5;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final UserAccountStore userAccountStore;
    private final NativeJwtService nativeJwtService;
    private final AuthProperties authProperties;
    private final AuthMailer authMailer;
    private final Map<String, PendingEmail> pendingEmails = new ConcurrentHashMap<>();

    public AccountFactorService(
            UserAccountStore userAccountStore,
            NativeJwtService nativeJwtService,
            AuthProperties authProperties,
            AuthMailer authMailer
    ) {
        this.userAccountStore = userAccountStore;
        this.nativeJwtService = nativeJwtService;
        this.authProperties = authProperties;
        this.authMailer = authMailer;
    }

    public String issueEmailCode(UserAccount account) {
        if (!authMailer.isConfigured()) {
            throw new AuthException(
                    503,
                    "L'envoi d'email n'est pas configuré. Renseignez DARTCHAIN_MAIL_HOST, DARTCHAIN_MAIL_USERNAME et DARTCHAIN_MAIL_PASSWORD."
            );
        }
        dropPendingFor(account.getId());
        String code = "%06d".formatted(RANDOM.nextInt(1_000_000));
        String verificationId = UUID.randomUUID().toString();
        pendingEmails.put(verificationId, new PendingEmail(
                account.getId(),
                hashCode(account.getId(), code),
                System.currentTimeMillis() + EMAIL_TTL_MS
        ));
        authMailer.sendVerificationCode(account.getEmail(), account.getUsername(), code);
        return verificationId;
    }

    public UserAccount consumeEmailCode(String verificationId, String code) {
        PendingEmail pending = pendingEmails.get(verificationId);
        if (pending == null || pending.expiresAt < System.currentTimeMillis()) {
            pendingEmails.remove(verificationId);
            throw new AuthException(401, "Code expiré ou inconnu. Demandez un nouvel envoi.");
        }
        if (pending.attempts >= MAX_ATTEMPTS) {
            pendingEmails.remove(verificationId);
            throw new AuthException(429, "Trop de tentatives. Demandez un nouveau code.");
        }
        pending.attempts++;
        if (!MessageDigest.isEqual(pending.codeHash, hashCode(pending.userId, code))) {
            throw new AuthException(401, "Code de confirmation invalide");
        }
        pendingEmails.remove(verificationId);
        return userAccountStore.findById(pending.userId)
                .orElseThrow(() -> new AuthException(404, "Utilisateur introuvable"));
    }

    public String resendEmailCode(String verificationId) {
        return issueEmailCode(pendingAccount(verificationId));
    }

    public UserAccount pendingAccount(String verificationId) {
        PendingEmail pending = pendingEmails.get(verificationId);
        if (pending == null) {
            throw new AuthException(400, "Demande de confirmation introuvable. Inscrivez-vous à nouveau.");
        }
        return userAccountStore.findById(pending.userId)
                .orElseThrow(() -> new AuthException(404, "Utilisateur introuvable"));
    }

    public String issueTotpChallenge(String userId) {
        return nativeJwtService.createChallengeToken(userId, "totp", 300);
    }

    public UserAccount consumeTotpChallenge(String challengeToken, String code) {
        String userId = nativeJwtService.parseChallenge(challengeToken, "totp")
                .orElseThrow(() -> new AuthException(401, "Vérification 2FA expirée. Reconnectez-vous."));
        UserAccount account = userAccountStore.findById(userId)
                .orElseThrow(() -> new AuthException(401, "Vérification 2FA expirée. Reconnectez-vous."));
        if (!account.isTotpEnabled() || !TotpAuthenticator.matches(account.getTotpSecret(), code)) {
            throw new AuthException(401, "Code d'authentification invalide");
        }
        return account;
    }

    public TotpSetupResponse beginTotpSetup(UserAccount account) {
        if (account.isTotpEnabled()) {
            throw new AuthException(409, "La double authentification est déjà active");
        }
        String secret = TotpAuthenticator.generateSecret();
        userAccountStore.updateTotp(account.getId(), secret, false);
        return new TotpSetupResponse(secret, TotpAuthenticator.otpauthUrl(account.getEmail(), secret));
    }

    public UserAccount enableTotp(UserAccount account, String code) {
        UserAccount current = userAccountStore.findById(account.getId())
                .orElseThrow(() -> new AuthException(404, "Utilisateur introuvable"));
        if (current.getTotpSecret() == null || current.getTotpSecret().isBlank()) {
            throw new AuthException(400, "Générez d'abord une clé d'authentification");
        }
        if (!TotpAuthenticator.matches(current.getTotpSecret(), code)) {
            throw new AuthException(401, "Code d'authentification invalide");
        }
        return userAccountStore.updateTotp(current.getId(), current.getTotpSecret(), true);
    }

    public UserAccount disableTotp(UserAccount account, String code) {
        UserAccount current = userAccountStore.findById(account.getId())
                .orElseThrow(() -> new AuthException(404, "Utilisateur introuvable"));
        if (!current.isTotpEnabled() || !TotpAuthenticator.matches(current.getTotpSecret(), code)) {
            throw new AuthException(401, "Code d'authentification invalide");
        }
        return userAccountStore.updateTotp(current.getId(), null, false);
    }

    public boolean emailVerificationRequired() {
        return authProperties.isEmailVerificationRequired();
    }

    public boolean mailConfigured() {
        return authMailer.isConfigured();
    }

    private void dropPendingFor(String userId) {
        pendingEmails.entrySet().removeIf(entry -> entry.getValue().userId.equals(userId));
    }

    private byte[] hashCode(String userId, String code) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            String material = authProperties.getJwtSecret() + ":" + userId + ":" + code;
            return digest.digest(material.getBytes(StandardCharsets.UTF_8));
        } catch (Exception exception) {
            throw new AuthException(500, "Impossible de protéger le code email");
        }
    }

    private static final class PendingEmail {
        private final String userId;
        private final byte[] codeHash;
        private final long expiresAt;
        private int attempts;

        private PendingEmail(String userId, byte[] codeHash, long expiresAt) {
            this.userId = userId;
            this.codeHash = codeHash;
            this.expiresAt = expiresAt;
        }
    }
}
