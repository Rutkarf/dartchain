package io.dartchain.backend.auth.audit;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Component
@ConditionalOnProperty(name = "dartchain.persistence.mode", havingValue = "memory", matchIfMissing = true)
public class InMemoryAuthAuditStore implements AuthAuditStore {

    private final List<AuthAuditEntry> entries = Collections.synchronizedList(new ArrayList<>());

    @Override
    public void record(String userId, String action, String detail, String ipAddress) {
        entries.add(new AuthAuditEntry(
                userId,
                action,
                detail,
                ipAddress,
                Instant.now().toEpochMilli()
        ));
    }

    public List<AuthAuditEntry> snapshot() {
        synchronized (entries) {
            return List.copyOf(entries);
        }
    }
}
