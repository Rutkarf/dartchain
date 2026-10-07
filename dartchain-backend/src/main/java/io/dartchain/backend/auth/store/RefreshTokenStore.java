package io.dartchain.backend.auth.store;

import java.util.Optional;

public interface RefreshTokenStore {

    String create(String userId);

    Optional<String> resolveUserId(String refreshToken);

    void revoke(String refreshToken);
}
