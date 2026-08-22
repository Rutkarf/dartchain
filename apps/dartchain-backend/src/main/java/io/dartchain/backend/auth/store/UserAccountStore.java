package io.dartchain.backend.auth.store;

import io.dartchain.backend.auth.model.UserAccount;

import java.util.Optional;

public interface UserAccountStore {

    Optional<UserAccount> findById(String id);

    Optional<UserAccount> findByUsername(String username);

    Optional<UserAccount> findByEmail(String email);

    Optional<UserAccount> findByWalletAddress(String walletAddress);

    UserAccount create(UserAccount account);

    UserAccount updateWallet(String userId, String walletAddress, String publicKey);

    UserAccount updatePassword(String userId, String passwordHash);
}
