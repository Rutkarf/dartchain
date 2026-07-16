package io.dartchain.backend.support;

import io.dartchain.backend.auth.AuthService;
import io.dartchain.backend.auth.AuthTokenResolver;
import io.dartchain.backend.auth.InMemoryRefreshTokenStore;
import io.dartchain.backend.auth.InMemorySessionStore;
import io.dartchain.backend.auth.JsonUserAccountStore;
import io.dartchain.backend.auth.audit.AuthAuditService;
import io.dartchain.backend.auth.audit.InMemoryAuthAuditStore;
import io.dartchain.backend.auth.jwt.NativeJwtService;
import io.dartchain.backend.auth.store.UserAccountStore;
import io.dartchain.backend.config.AuthProperties;
import io.dartchain.backend.quests.QuestService;

public final class AuthServiceTestSupport {

    public static final String LOCAL_IP = "127.0.0.1";

    private AuthServiceTestSupport() {
    }

    public static AuthService createAuthService(UserAccountStore userStore) {
        return createAuthService(userStore, null);
    }

    public static AuthService createAuthService(UserAccountStore userStore, QuestService questService) {
        AuthProperties authProperties = new AuthProperties();
        NativeJwtService nativeJwtService = new NativeJwtService(authProperties);
        InMemoryRefreshTokenStore refreshTokenStore = new InMemoryRefreshTokenStore(authProperties);
        InMemorySessionStore sessionStore = new InMemorySessionStore(3600);
        AuthTokenResolver authTokenResolver = new AuthTokenResolver(
                nativeJwtService,
                refreshTokenStore,
                sessionStore,
                userStore,
                authProperties
        );
        AuthAuditService authAuditService = new AuthAuditService(new InMemoryAuthAuditStore());

        if (questService == null) {
            return new AuthService(
                    userStore,
                    refreshTokenStore,
                    authTokenResolver,
                    nativeJwtService,
                    authProperties,
                    authAuditService
            );
        }

        return new AuthService(
                userStore,
                refreshTokenStore,
                authTokenResolver,
                nativeJwtService,
                authProperties,
                authAuditService,
                questService,
                null
        );
    }

    public static AuthService createJsonAuthService(JsonUserAccountStore userStore) {
        return createAuthService(userStore);
    }

    public static AuthService createJsonAuthService(JsonUserAccountStore userStore, QuestService questService) {
        return createAuthService(userStore, questService);
    }
}
