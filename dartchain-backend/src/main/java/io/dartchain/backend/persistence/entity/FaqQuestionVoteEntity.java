package io.dartchain.backend.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "faq_question_votes")
public class FaqQuestionVoteEntity {

    @EmbeddedId
    private FaqQuestionVoteId id;

    @Column(nullable = false, length = 16)
    private String direction;

    public FaqQuestionVoteId getId() {
        return id;
    }

    public void setId(FaqQuestionVoteId id) {
        this.id = id;
    }

    public String getDirection() {
        return direction;
    }

    public void setDirection(String direction) {
        this.direction = direction;
    }
}
