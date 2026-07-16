package io.dartchain.backend.auth.audit;

public interface AuthAuditStore {

    void record(String userId, String action, String detail, String ipAddress);
}
