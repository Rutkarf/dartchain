package io.dartchain.backend.auth.store;

import io.dartchain.backend.auth.model.UserAccount;
import io.dartchain.backend.auth.model.UserRole;

import java.util.List;
import java.util.Optional;

public interface UserAccountStore {

    Optional<UserAccount> findById(String id);

    Optional<UserAccount> findByUsername(String username);

    Optional<UserAccount> findByEmail(String email);

    Optional<UserAccount> findByWalletAddress(String walletAddress);

    /** Export admin — sans secrets (hash/salt exclus côté service). */
    List<UserAccount> findAll();

    UserAccount create(UserAccount account);

    UserAccount updateWallet(String userId, String walletAddress, String publicKey);

    UserAccount updatePassword(String userId, String passwordHash);

    UserAccount updateRole(String userId, UserRole role);
}
