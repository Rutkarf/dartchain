package io.dartchain.backend.auth.application;

import io.dartchain.backend.auth.model.UserAccount;
import io.dartchain.backend.auth.jwt.NativeJwtService;
import io.dartchain.backend.auth.store.RefreshTokenStore;
import io.dartchain.backend.auth.store.SessionStore;
import io.dartchain.backend.auth.store.UserAccountStore;
import io.dartchain.backend.config.AuthProperties;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * Phase AB — résolution centralisée JWT + sessions legacy.
 */
@Service
public class AuthTokenResolver {

    private final NativeJwtService nativeJwtService;
    private final RefreshTokenStore refreshTokenStore;
    private final SessionStore sessionStore;
    private final UserAccountStore userAccountStore;
    private final AuthProperties authProperties;

    public AuthTokenResolver(
            NativeJwtService nativeJwtService,
            RefreshTokenStore refreshTokenStore,
            SessionStore sessionStore,
            UserAccountStore userAccountStore,
            AuthProperties authProperties
    ) {
        this.nativeJwtService = nativeJwtService;
        this.refreshTokenStore = refreshTokenStore;
        this.sessionStore = sessionStore;
        this.userAccountStore = userAccountStore;
        this.authProperties = authProperties;
    }

    public Optional<UserAccount> resolveAccount(String rawAuthorization) {
        String token = AuthService.extractToken(rawAuthorization);
        if (token.isBlank()) {
            return Optional.empty();
        }

        if (looksLikeJwt(token)) {
            return nativeJwtService.parseAndValidate(token)
                    .flatMap(claims -> userAccountStore.findById(claims.subject()));
        }

        if (!authProperties.isLegacySessionEnabled()) {
            return Optional.empty();
        }

        return sessionStore.resolveUserId(token).flatMap(userAccountStore::findById);
    }

    public Optional<UserAccount> resolveRefreshToken(String refreshToken) {
        return refreshTokenStore.resolveUserId(refreshToken).flatMap(userAccountStore::findById);
    }

    public static boolean looksLikeJwt(String token) {
        return token != null && token.chars().filter(ch -> ch == '.').count() == 2;
    }
}
