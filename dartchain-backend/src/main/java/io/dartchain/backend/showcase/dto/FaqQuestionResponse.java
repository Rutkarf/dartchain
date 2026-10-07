package io.dartchain.backend.showcase.dto;

public record FaqQuestionResponse(
        String id,
        String authorId,
        String authorName,
        String title,
        String body,
        String createdAt,
        String status,
        int score,
        int upvotes,
        int downvotes,
        int answerCount,
        boolean pendingStaffReview,
        String userVote
) {}
