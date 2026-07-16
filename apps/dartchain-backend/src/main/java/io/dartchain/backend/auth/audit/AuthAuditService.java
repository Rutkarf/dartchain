package io.dartchain.backend.auth.audit;

import org.springframework.stereotype.Service;

@Service
public class AuthAuditService {

    private final AuthAuditStore authAuditStore;

    public AuthAuditService(AuthAuditStore authAuditStore) {
        this.authAuditStore = authAuditStore;
    }

    public void loginSuccess(String userId, String ipAddress) {
        authAuditStore.record(userId, "auth.login.success", null, ipAddress);
    }

    public void loginFailure(String identifier, String ipAddress) {
        authAuditStore.record(null, "auth.login.failure", identifier, ipAddress);
    }

    public void registerSuccess(String userId, String ipAddress) {
        authAuditStore.record(userId, "auth.register.success", null, ipAddress);
    }

    public void logout(String userId, String ipAddress) {
        authAuditStore.record(userId, "auth.logout", null, ipAddress);
    }

    public void refresh(String userId, String ipAddress) {
        authAuditStore.record(userId, "auth.refresh", null, ipAddress);
    }

    public void accessDenied(String userId, String action, String ipAddress) {
        authAuditStore.record(userId, "auth.access.denied", action, ipAddress);
    }

    public void mutation(String userId, String action, String detail, String ipAddress) {
        authAuditStore.record(userId, "mutation." + action, detail, ipAddress);
    }
}
