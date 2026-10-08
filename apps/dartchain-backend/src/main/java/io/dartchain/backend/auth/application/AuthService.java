package io.dartchain.backend.auth.application;

import io.dartchain.backend.auth.audit.AuthAuditService;
import io.dartchain.backend.auth.model.UserAccount;
import io.dartchain.backend.auth.model.UserRole;
import io.dartchain.backend.auth.dto.AuthResponse;
import io.dartchain.backend.auth.dto.EmailCodeRequest;
import io.dartchain.backend.auth.dto.LinkWalletRequest;
import io.dartchain.backend.auth.dto.LoginRequest;
import io.dartchain.backend.auth.dto.RefreshRequest;
import io.dartchain.backend.auth.dto.RegisterRequest;
import io.dartchain.backend.auth.dto.TotpCodeRequest;
import io.dartchain.backend.auth.dto.TotpSetupResponse;
import io.dartchain.backend.auth.dto.TotpVerifyRequest;
import io.dartchain.backend.auth.dto.UserProfileResponse;
import io.dartchain.backend.auth.jwt.NativeJwtService;
import io.dartchain.backend.auth.store.RefreshTokenStore;
import io.dartchain.backend.auth.store.UserAccountStore;
import io.dartchain.backend.config.AuthProperties;
import io.dartchain.backend.ops.ApplicationMetricsCollector;
import io.dartchain.backend.quests.application.QuestService;
import io.dartchain.backend.shared.utils.CryptoUtils;
import io.dartchain.backend.shared.utils.WalletValidator;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
public class AuthService {

    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");

    private final UserAccountStore userAccountStore;
    private final RefreshTokenStore refreshTokenStore;
    private final AuthTokenResolver authTokenResolver;
    private final NativeJwtService nativeJwtService;
    private final AuthProperties authProperties;
    private final AuthAuditService authAuditService;
    private final QuestService questService;
    private final ApplicationMetricsCollector metricsCollector;
    private final AccountFactorService accountFactorService;

    public AuthService(
            UserAccountStore userAccountStore,
            RefreshTokenStore refreshTokenStore,
            AuthTokenResolver authTokenResolver,
            NativeJwtService nativeJwtService,
            AuthProperties authProperties,
            AuthAuditService authAuditService
    ) {
        this(userAccountStore, refreshTokenStore, authTokenResolver, nativeJwtService, authProperties, authAuditService, null, null, null);
    }

    public AuthService(
            UserAccountStore userAccountStore,
            RefreshTokenStore refreshTokenStore,
            AuthTokenResolver authTokenResolver,
            NativeJwtService nativeJwtService,
            AuthProperties authProperties,
            AuthAuditService authAuditService,
            @Lazy QuestService questService,
            ApplicationMetricsCollector metricsCollector
    ) {
        this(userAccountStore, refreshTokenStore, authTokenResolver, nativeJwtService, authProperties, authAuditService, questService, metricsCollector, null);
    }

    @Autowired
    public AuthService(
            UserAccountStore userAccountStore,
            RefreshTokenStore refreshTokenStore,
            AuthTokenResolver authTokenResolver,
            NativeJwtService nativeJwtService,
            AuthProperties authProperties,
            AuthAuditService authAuditService,
            @Lazy QuestService questService,
            ApplicationMetricsCollector metricsCollector,
            AccountFactorService accountFactorService
    ) {
        this.userAccountStore = userAccountStore;
        this.refreshTokenStore = refreshTokenStore;
        this.authTokenResolver = authTokenResolver;
        this.nativeJwtService = nativeJwtService;
        this.authProperties = authProperties;
        this.authAuditService = authAuditService;
        this.questService = questService;
        this.metricsCollector = metricsCollector;
        this.accountFactorService = accountFactorService;
    }

    public AuthResponse register(RegisterRequest request, String ipAddress) {
        String username = request.username().trim();
        String email = request.email().trim();
        String password = request.password();
        validatePassword(password);
        if (requiresEmailVerification() && !accountFactorService.mailConfigured()) {
            throw new AuthException(
                    503,
                    "L'envoi d'email n'est pas configuré. Renseignez DARTCHAIN_MAIL_HOST, DARTCHAIN_MAIL_USERNAME et DARTCHAIN_MAIL_PASSWORD."
            );
        }

        Optional<UserAccount> existingUsername = userAccountStore.findByUsername(username);
        if (existingUsername.isPresent()) {
            return resumeUnverifiedRegistration(existingUsername.get(), email);
        }

        Optional<UserAccount> existingEmail = userAccountStore.findByEmail(email);
        if (existingEmail.isPresent()) {
            return resumeUnverifiedRegistration(existingEmail.get(), email);
        }

        UserAccount account = new UserAccount(
                UUID.randomUUID().toString(),
                username,
                email,
                PasswordHasher.hashBcrypt(password),
                "",
                System.currentTimeMillis()
        );
        account.setRole(resolveBootstrapRole(username));
        if (requiresEmailVerification()) {
            account.setEmailVerified(Boolean.FALSE);
        }

        userAccountStore.create(account);
        if (metricsCollector != null) {
            metricsCollector.recordAuthRegistration(username);
        }
        authAuditService.registerSuccess(account.getId(), ipAddress);
        if (requiresEmailVerification()) {
            return AuthResponse.emailVerification(accountFactorService.issueEmailCode(account), toProfile(account));
        }
        return buildAuthResponse(account);
    }

    public AuthResponse login(LoginRequest request, String ipAddress) {
        String identifier = request.identifier().trim();
        UserAccount account = resolveAccount(identifier)
                .orElseThrow(() -> {
                    authAuditService.loginFailure(identifier, ipAddress);
                    return new AuthException(401, "Identifiants invalides");
                });

        if (PasswordHasher.isOAuthAccount(account.getPasswordHash())) {
            authAuditService.loginFailure(identifier, ipAddress);
            throw new AuthException(401, "Ce compte utilise une connexion sociale. Utilisez Google ou Meta.");
        }

        if (!PasswordHasher.verify(request.password(), account.getPasswordSalt(), account.getPasswordHash())) {
            authAuditService.loginFailure(identifier, ipAddress);
            throw new AuthException(401, "Identifiants invalides");
        }

        if (!PasswordHasher.isBcryptHash(account.getPasswordHash())) {
            userAccountStore.updatePassword(account.getId(), PasswordHasher.hashBcrypt(request.password()));
        }

        if (metricsCollector != null) {
            metricsCollector.recordAuthLogin(identifier);
        }
        authAuditService.loginSuccess(account.getId(), ipAddress);
        if (requiresEmailVerification() && !account.isEmailVerified()) {
            return AuthResponse.emailVerification(accountFactorService.issueEmailCode(account), toProfile(account));
        }
        return finishLogin(account);
    }

    public AuthResponse confirmEmail(EmailCodeRequest request, String ipAddress) {
        UserAccount account = accountFactorService.consumeEmailCode(request.verificationId(), request.code());
        account = userAccountStore.markEmailVerified(account.getId());
        authAuditService.loginSuccess(account.getId(), ipAddress);
        return finishLogin(account);
    }

    public AuthResponse resendEmail(String verificationId) {
        String nextId = accountFactorService.resendEmailCode(verificationId);
        UserAccount account = accountFactorService.pendingAccount(nextId);
        return AuthResponse.emailVerification(nextId, toProfile(account));
    }

    public AuthResponse confirmTotp(TotpVerifyRequest request, String ipAddress) {
        UserAccount account = accountFactorService.consumeTotpChallenge(request.challengeToken(), request.code());
        authAuditService.loginSuccess(account.getId(), ipAddress);
        return buildAuthResponse(account);
    }

    public TotpSetupResponse beginTotpSetup(String authorization) {
        return accountFactorService.beginTotpSetup(requireAuthenticatedAccount(authorization));
    }

    public UserProfileResponse enableTotp(String authorization, TotpCodeRequest request) {
        UserAccount account = accountFactorService.enableTotp(
                requireAuthenticatedAccount(authorization),
                request.code()
        );
        return toProfile(account);
    }

    public UserProfileResponse disableTotp(String authorization, TotpCodeRequest request) {
        UserAccount account = accountFactorService.disableTotp(
                requireAuthenticatedAccount(authorization),
                request.code()
        );
        return toProfile(account);
    }

    public AuthResponse loginOAuth(UserAccount account, String ipAddress) {
        if (metricsCollector != null) {
            metricsCollector.recordAuthLogin(account.getUsername());
        }
        authAuditService.loginSuccess(account.getId(), ipAddress);
        return finishLogin(account);
    }

    public AuthResponse refresh(RefreshRequest request, String ipAddress) {
        if (request == null || request.refreshToken() == null || request.refreshToken().isBlank()) {
            throw new AuthException(400, "refreshToken requis");
        }

        UserAccount account = authTokenResolver.resolveRefreshToken(request.refreshToken())
                .orElseThrow(() -> new AuthException(401, "Refresh token invalide ou expiré"));

        refreshTokenStore.revoke(request.refreshToken());
        authAuditService.refresh(account.getId(), ipAddress);
        if (metricsCollector != null) {
            metricsCollector.recordAuthRefresh(account.getId());
        }
        return buildAuthResponse(account);
    }

    public UserProfileResponse me(String token) {
        UserAccount account = requireAuthenticatedAccount(token);
        return toProfile(account);
    }

    public void logout(String token, RefreshRequest refreshRequest, String ipAddress) {
        UserAccount account = authTokenResolver.resolveAccount(token).orElse(null);
        if (refreshRequest != null && refreshRequest.refreshToken() != null) {
            refreshTokenStore.revoke(refreshRequest.refreshToken());
        }
        if (account != null) {
            authAuditService.logout(account.getId(), ipAddress);
            if (metricsCollector != null) {
                metricsCollector.recordAuthLogout(account.getId());
            }
        }
    }

    public UserProfileResponse linkWallet(String token, LinkWalletRequest request) {
        UserAccount account = requireAuthenticatedAccount(token);

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
        } catch (AuthException exception) {
            throw exception;
        } catch (RuntimeException exception) {
            throw new AuthException(400, "Clé publique invalide");
        }

        userAccountStore.findByWalletAddress(walletAddress).ifPresent(existing -> {
            if (!existing.getId().equals(account.getId())) {
                throw new AuthException(409, "Ce wallet est déjà lié à un autre compte");
            }
        });

        UserAccount updated = userAccountStore.updateWallet(account.getId(), walletAddress, publicKey);
        if (questService != null) {
            questService.flushPendingAutoClaims(updated.getId());
        }
        return userAccountStore.findById(updated.getId())
                .map(this::toProfile)
                .orElseGet(() -> toProfile(updated));
    }

    public UserAccount requireAuthenticatedAccount(String token) {
        return authTokenResolver.resolveAccount(token)
                .orElseThrow(() -> new AuthException(401, "Session invalide ou expirée"));
    }

    public void ensureWalletOwnership(UserAccount account, String walletAddress) {
        if (account.getWalletAddress() == null || account.getWalletAddress().isBlank()) {
            throw new AuthException(403, "Aucun portefeuille lié au compte. Liez un portefeuille avant de continuer.");
        }

        if (!account.getWalletAddress().equalsIgnoreCase(WalletValidator.normalize(walletAddress))) {
            throw new AuthException(403, "Ce wallet ne correspond pas à votre compte");
        }
    }

    public Optional<UserAccount> findAccountById(String userId) {
        if (userId == null || userId.isBlank()) {
            return Optional.empty();
        }
        return userAccountStore.findById(userId);
    }

    public Optional<UserAccount> findAccountByWalletAddress(String walletAddress) {
        if (walletAddress == null || walletAddress.isBlank()) {
            return Optional.empty();
        }
        return userAccountStore.findByWalletAddress(WalletValidator.normalize(walletAddress));
    }

    private AuthResponse resumeUnverifiedRegistration(UserAccount existing, String email) {
        boolean sameEmail = AuthNormalizer.normalizeEmail(existing.getEmail())
                .equals(AuthNormalizer.normalizeEmail(email));
        if (requiresEmailVerification() && !existing.isEmailVerified() && sameEmail) {
            return AuthResponse.emailVerification(accountFactorService.issueEmailCode(existing), toProfile(existing));
        }
        if (AuthNormalizer.normalizeEmail(existing.getEmail()).equals(AuthNormalizer.normalizeEmail(email))) {
            throw new AuthException(409, "Cet email est déjà utilisé");
        }
        throw new AuthException(409, "Ce nom d'utilisateur est déjà utilisé");
    }

    private boolean requiresEmailVerification() {
        return accountFactorService != null && accountFactorService.emailVerificationRequired();
    }

    private AuthResponse finishLogin(UserAccount account) {
        if (account.isTotpEnabled() && accountFactorService != null) {
            return AuthResponse.twoFactor(accountFactorService.issueTotpChallenge(account.getId()), toProfile(account));
        }
        return buildAuthResponse(account);
    }

    private AuthResponse buildAuthResponse(UserAccount account) {
        String accessToken = nativeJwtService.createAccessToken(account.getId(), account.getRole());
        String refreshToken = refreshTokenStore.create(account.getId());
        recordDailyLoginQuest(account);
        UserProfileResponse profile = toProfile(account);
        return new AuthResponse(
                accessToken,
                accessToken,
                refreshToken,
                nativeJwtService.accessTokenTtlSeconds(),
                "Bearer",
                profile
        );
    }

    private UserRole resolveBootstrapRole(String username) {
        String bootstrap = authProperties.getBootstrapAdminUsername();
        if (bootstrap != null
                && !bootstrap.isBlank()
                && bootstrap.equalsIgnoreCase(username.trim())) {
            return UserRole.ADMIN;
        }
        return UserRole.USER;
    }

    private void recordDailyLoginQuest(UserAccount account) {
        if (questService != null) {
            questService.recordProgressForUserId(account.getId(), "daily-login", 1);
        }
    }

    private Optional<UserAccount> resolveAccount(String identifier) {
        if (EMAIL_PATTERN.matcher(identifier).matches()) {
            return userAccountStore.findByEmail(identifier);
        }
        return userAccountStore.findByUsername(identifier);
    }

    private void validatePassword(String password) {
        int minLength = authProperties.getPasswordMinLength();
        if (password == null || password.length() < minLength) {
            throw new AuthException(400, "Mot de passe trop court (minimum " + minLength + " caractères)");
        }
    }

    private UserProfileResponse toProfile(UserAccount account) {
        return new UserProfileResponse(
                account.getId(),
                account.getUsername(),
                account.getEmail(),
                account.getCreatedAt(),
                account.getWalletAddress(),
                account.getWalletPublicKey(),
                account.getRole().name(),
                account.isTotpEnabled()
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
