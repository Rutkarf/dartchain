package io.dartchain.backend.quests;

import io.dartchain.backend.quests.model.QuestProgressState;

import java.util.ArrayList;
import java.util.List;

public class QuestProgressSnapshot {

    private List<QuestProgressEntry> entries = new ArrayList<>();

    public List<QuestProgressEntry> getEntries() {
        return entries;
    }

    public void setEntries(List<QuestProgressEntry> entries) {
        this.entries = entries != null ? entries : new ArrayList<>();
    }

    public static class QuestProgressEntry {

        private String userId;
        private QuestProgressState state;

        public String getUserId() {
            return userId;
        }

        public void setUserId(String userId) {
            this.userId = userId;
        }

        public QuestProgressState getState() {
            return state;
        }

        public void setState(QuestProgressState state) {
            this.state = state;
        }
    }
}
