package io.dartchain.backend.showcase.faq;

import io.dartchain.backend.showcase.model.FaqQuestion;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class FaqQuestionSnapshot {

    private List<FaqQuestion> questions = new ArrayList<>();
    private Map<String, Map<String, String>> votes = new HashMap<>();

    public List<FaqQuestion> getQuestions() {
        return questions;
    }

    public void setQuestions(List<FaqQuestion> questions) {
        this.questions = questions != null ? questions : new ArrayList<>();
    }

    public Map<String, Map<String, String>> getVotes() {
        return votes;
    }

    public void setVotes(Map<String, Map<String, String>> votes) {
        this.votes = votes != null ? votes : new HashMap<>();
    }
}
