package io.dartchain.backend.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class FaqQuestionVoteId implements Serializable {

    @Column(name = "question_id", length = 64)
    private String questionId;

    @Column(name = "user_id", length = 64)
    private String userId;

    public FaqQuestionVoteId() {
    }

    public FaqQuestionVoteId(String questionId, String userId) {
        this.questionId = questionId;
        this.userId = userId;
    }

    public String getQuestionId() {
        return questionId;
    }

    public void setQuestionId(String questionId) {
        this.questionId = questionId;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    @Override
    public boolean equals(Object other) {
        if (this == other) {
            return true;
        }
        if (!(other instanceof FaqQuestionVoteId that)) {
            return false;
        }
        return Objects.equals(questionId, that.questionId) && Objects.equals(userId, that.userId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(questionId, userId);
    }
}
