package io.dartchain.backend.access.application;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
@ConditionalOnProperty(name = "dartchain.persistence.mode", havingValue = "memory", matchIfMissing = true)
public class InMemoryIpBanStore implements IpBanStore {

    private final Map<String, String> bans = new ConcurrentHashMap<>();

    @Override
    public boolean exists(String ipAddress) {
        return bans.containsKey(ipAddress);
    }

    @Override
    public void save(String ipAddress, String reason, String userAgent) {
        bans.putIfAbsent(ipAddress, reason == null ? "age_decline" : reason);
    }
}
