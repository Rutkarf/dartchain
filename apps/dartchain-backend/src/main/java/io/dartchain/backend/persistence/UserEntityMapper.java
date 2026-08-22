package io.dartchain.backend.persistence;

import io.dartchain.backend.auth.application.AuthNormalizer;
import io.dartchain.backend.auth.model.UserAccount;
import io.dartchain.backend.auth.model.UserRole;
import io.dartchain.backend.persistence.entity.UserEntity;

import java.time.Instant;
import java.util.UUID;

public final class UserEntityMapper {

    private UserEntityMapper() {
    }

    public static UserEntity toEntity(UserAccount account) {
        UserEntity entity = new UserEntity();
        entity.setId(UUID.fromString(account.getId()));
        entity.setUsername(AuthNormalizer.normalizeUsername(account.getUsername()));
        entity.setEmail(AuthNormalizer.normalizeEmail(account.getEmail()));
        entity.setPasswordHash(account.getPasswordHash());
        entity.setPasswordSalt(account.getPasswordSalt());
        entity.setWalletAddress(account.getWalletAddress());
        entity.setWalletPublicKey(account.getWalletPublicKey());
        entity.setCreatedAt(Instant.ofEpochMilli(account.getCreatedAt()));
        entity.setRole(account.getRole().name());
        return entity;
    }

    public static UserAccount toAccount(UserEntity entity) {
        UserAccount account = new UserAccount();
        account.setId(entity.getId().toString());
        account.setUsername(entity.getUsername());
        account.setEmail(entity.getEmail());
        account.setPasswordHash(entity.getPasswordHash());
        account.setPasswordSalt(entity.getPasswordSalt());
        account.setWalletAddress(entity.getWalletAddress());
        account.setWalletPublicKey(entity.getWalletPublicKey());
        account.setCreatedAt(entity.getCreatedAt().toEpochMilli());
        account.setRole(UserRole.fromValue(entity.getRole()));
        return account;
    }
}
