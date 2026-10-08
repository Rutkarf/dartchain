package io.dartchain.backend.auth.model;

/**
 * Rôles persistés. L'absence d'authentification n'est pas une valeur de cette enum.
 */
public enum UserRole {
    USER,
    ADMIN;

    public boolean isAtLeast(UserRole required) {
        if (required == USER) {
            return this == USER || this == ADMIN;
        }
        return this == ADMIN;
    }

    public static UserRole fromValue(String value) {
        if (value == null || value.isBlank()) {
            return USER;
        }
        try {
            return UserRole.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("Rôle inconnu : " + value.trim());
        }
    }
}
