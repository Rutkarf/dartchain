package io.dartchain.backend.showcase.model;

/**
 * Lifecycle status for community FAQ entries.
 * Extensible for future governance workflows (moderation, proposals).
 */
public enum FaqQuestionStatus {
    ACTIVE,
    PINNED,
    ARCHIVED
}
