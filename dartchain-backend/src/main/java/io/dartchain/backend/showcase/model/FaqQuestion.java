package io.dartchain.backend.showcase.model;

import java.time.Instant;

public class FaqQuestion {

    private String id;
    private String authorId;
    private String authorName;
    private String title;
    private String body;
    private Instant createdAt;
    private FaqQuestionStatus status;
    private int score;
    private int upvotes;
    private int downvotes;
    private int answerCount;
    private boolean pendingStaffReview;

    public FaqQuestion() {
    }

    public FaqQuestion(
            String id,
            String authorId,
            String authorName,
            String title,
            String body,
            Instant createdAt,
            FaqQuestionStatus status,
            int score,
            int upvotes,
            int downvotes,
            int answerCount,
            boolean pendingStaffReview
    ) {
        this.id = id;
        this.authorId = authorId;
        this.authorName = authorName;
        this.title = title;
        this.body = body;
        this.createdAt = createdAt;
        this.status = status;
        this.score = score;
        this.upvotes = upvotes;
        this.downvotes = downvotes;
        this.answerCount = answerCount;
        this.pendingStaffReview = pendingStaffReview;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getAuthorId() {
        return authorId;
    }

    public void setAuthorId(String authorId) {
        this.authorId = authorId;
    }

    public String getAuthorName() {
        return authorName;
    }

    public void setAuthorName(String authorName) {
        this.authorName = authorName;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getBody() {
        return body;
    }

    public void setBody(String body) {
        this.body = body;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public FaqQuestionStatus getStatus() {
        return status;
    }

    public void setStatus(FaqQuestionStatus status) {
        this.status = status;
    }

    public int getScore() {
        return score;
    }

    public void setScore(int score) {
        this.score = score;
    }

    public int getUpvotes() {
        return upvotes;
    }

    public void setUpvotes(int upvotes) {
        this.upvotes = upvotes;
    }

    public int getDownvotes() {
        return downvotes;
    }

    public void setDownvotes(int downvotes) {
        this.downvotes = downvotes;
    }

    public int getAnswerCount() {
        return answerCount;
    }

    public void setAnswerCount(int answerCount) {
        this.answerCount = answerCount;
    }

    public boolean isPendingStaffReview() {
        return pendingStaffReview;
    }

    public void setPendingStaffReview(boolean pendingStaffReview) {
        this.pendingStaffReview = pendingStaffReview;
    }
}
