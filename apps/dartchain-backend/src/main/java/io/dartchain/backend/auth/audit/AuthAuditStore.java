package io.dartchain.backend.auth.audit;

import java.util.List;

public interface AuthAuditStore {

    void record(String userId, String action, String detail, String ipAddress);

    List<AuthAuditEntry> snapshot();
}
