package io.dartchain.backend.quests.model;

public class QuestTaskState {

    private int progress;
    private boolean claimed;

    public QuestTaskState() {
    }

    public QuestTaskState(int progress, boolean claimed) {
        this.progress = progress;
        this.claimed = claimed;
    }

    public int getProgress() {
        return progress;
    }

    public void setProgress(int progress) {
        this.progress = progress;
    }

    public boolean isClaimed() {
        return claimed;
    }

    public void setClaimed(boolean claimed) {
        this.claimed = claimed;
    }
}
