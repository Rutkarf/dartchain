package io.dartchain.backend.showcase.model;

public enum FaqVoteDirection {
    UP,
    DOWN;

    public static FaqVoteDirection fromValue(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Vote direction is required");
        }
        try {
            return FaqVoteDirection.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("Invalid vote direction: " + value);
        }
    }
}
