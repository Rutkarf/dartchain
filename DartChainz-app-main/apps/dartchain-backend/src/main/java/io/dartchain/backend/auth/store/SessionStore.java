package io.dartchain.backend.auth.store;

import java.util.Optional;

public interface SessionStore {

    String createSession(String userId);

    Optional<String> resolveUserId(String token);

    void revoke(String token);
}
