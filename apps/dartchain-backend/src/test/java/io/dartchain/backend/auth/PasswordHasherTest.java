package io.dartchain.backend.auth;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class PasswordHasherTest {

    @Test
    void hashesAndVerifiesBcryptPasswords() {
        String hash = PasswordHasher.hashBcrypt("password123");

        assertThat(PasswordHasher.isBcryptHash(hash)).isTrue();
        assertThat(PasswordHasher.verify("password123", "", hash)).isTrue();
        assertThat(PasswordHasher.verify("wrong", "", hash)).isFalse();
    }

    @Test
    void stillVerifiesLegacySha256Passwords() {
        String salt = PasswordHasher.generateSalt();
        String hash = PasswordHasher.hashLegacy("password123", salt);

        assertThat(PasswordHasher.isBcryptHash(hash)).isFalse();
        assertThat(PasswordHasher.verify("password123", salt, hash)).isTrue();
        assertThat(PasswordHasher.verify("wrong", salt, hash)).isFalse();
    }
}
