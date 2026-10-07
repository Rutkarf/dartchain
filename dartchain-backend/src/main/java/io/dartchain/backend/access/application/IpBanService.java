package io.dartchain.backend.access.application;

import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class IpBanService {

    private final IpBanStore store;
    private final Map<String, Boolean> cache = new ConcurrentHashMap<>();

    public IpBanService(IpBanStore store) {
        this.store = store;
    }

    public boolean isBanned(String ipAddress) {
        if (ipAddress == null || ipAddress.isBlank()) {
            return false;
        }
        String key = normalize(ipAddress);
        // Toujours lire le store : un DELETE ops doit débloquer sans redémarrage.
        // Cache uniquement les positifs pour limiter le bruit sous ban.
        Boolean cached = cache.get(key);
        if (Boolean.TRUE.equals(cached)) {
            boolean still = store.exists(key);
            if (!still) {
                cache.remove(key);
            }
            return still;
        }
        boolean banned = store.exists(key);
        if (banned) {
            cache.put(key, true);
        }
        return banned;
    }

    public void ban(String ipAddress, String reason, String userAgent) {
        if (ipAddress == null || ipAddress.isBlank()) {
            return;
        }
        String key = normalize(ipAddress);
        if (store.exists(key)) {
            cache.put(key, true);
            return;
        }
        store.save(key, reason, userAgent);
        cache.put(key, true);
    }

    private static String normalize(String ipAddress) {
        return ipAddress.trim();
    }
}
