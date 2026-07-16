package io.dartchain.backend.auth.security;

import io.dartchain.backend.auth.AuthException;
import io.dartchain.backend.auth.AuthTokenResolver;
import io.dartchain.backend.auth.UserAccount;
import io.dartchain.backend.auth.UserRole;
import io.dartchain.backend.auth.audit.AuthAuditService;
import io.dartchain.backend.ops.ApplicationMetricsCollector;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class RoleAuthorizationService {

    private final AuthTokenResolver authTokenResolver;
    private final AuthAuditService authAuditService;
    private final ApplicationMetricsCollector metricsCollector;

    public RoleAuthorizationService(
            AuthTokenResolver authTokenResolver,
            AuthAuditService authAuditService
    ) {
        this(authTokenResolver, authAuditService, null);
    }

    @Autowired
    public RoleAuthorizationService(
            AuthTokenResolver authTokenResolver,
            AuthAuditService authAuditService,
            ApplicationMetricsCollector metricsCollector
    ) {
        this.authTokenResolver = authTokenResolver;
        this.authAuditService = authAuditService;
        this.metricsCollector = metricsCollector;
    }

    public UserAccount requireAuthenticated(String authorization) {
        return authTokenResolver.resolveAccount(authorization)
                .orElseThrow(() -> new AuthException(401, "Authentification requise"));
    }

    public UserAccount requireUser(String authorization, String ipAddress) {
        UserAccount account = requireAuthenticated(authorization);
        if (!account.getRole().isAtLeast(UserRole.USER)) {
            recordRbacDenied("requireUser", account.getUsername());
            authAuditService.accessDenied(account.getId(), "requireUser", ipAddress);
            throw new AuthException(403, "Rôle utilisateur requis");
        }
        return account;
    }

    public UserAccount requireAdmin(String authorization, String ipAddress) {
        UserAccount account = requireAuthenticated(authorization);
        if (account.getRole() != UserRole.ADMIN) {
            recordRbacDenied("requireAdmin", account.getUsername());
            authAuditService.accessDenied(account.getId(), "requireAdmin", ipAddress);
            throw new AuthException(403, "Rôle administrateur requis");
        }
        return account;
    }

    public UserAccount authorizeMutation(
            String authorization,
            String action,
            String detail,
            String ipAddress
    ) {
        UserAccount account = requireUser(authorization, ipAddress);
        authAuditService.mutation(account.getId(), action, detail, ipAddress);
        if (metricsCollector != null) {
            metricsCollector.recordMutation(action, detail);
        }
        return account;
    }

    private void recordRbacDenied(String action, String detail) {
        if (metricsCollector != null) {
            metricsCollector.recordRbacDenied(action, detail);
        }
    }
}
