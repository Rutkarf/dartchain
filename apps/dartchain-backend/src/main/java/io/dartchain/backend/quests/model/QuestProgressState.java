package io.dartchain.backend.quests.model;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class QuestProgressState {

    private String dayKey;
    private String weekKey;
    private Map<String, QuestTaskState> tasks = new LinkedHashMap<>();
    private List<Integer> exploredBlockIndices = new ArrayList<>();
    private boolean missionClaimed;
    private boolean weeklyClaimed;
    private int totalXp;
    private BigDecimal pendingMts = BigDecimal.ZERO;

    public String getDayKey() {
        return dayKey;
    }

    public void setDayKey(String dayKey) {
        this.dayKey = dayKey;
    }

    public String getWeekKey() {
        return weekKey;
    }

    public void setWeekKey(String weekKey) {
        this.weekKey = weekKey;
    }

    public Map<String, QuestTaskState> getTasks() {
        return tasks;
    }

    public void setTasks(Map<String, QuestTaskState> tasks) {
        this.tasks = tasks != null ? tasks : new LinkedHashMap<>();
    }

    public List<Integer> getExploredBlockIndices() {
        return exploredBlockIndices;
    }

    public void setExploredBlockIndices(List<Integer> exploredBlockIndices) {
        this.exploredBlockIndices = exploredBlockIndices != null ? exploredBlockIndices : new ArrayList<>();
    }

    public boolean isMissionClaimed() {
        return missionClaimed;
    }

    public void setMissionClaimed(boolean missionClaimed) {
        this.missionClaimed = missionClaimed;
    }

    public boolean isWeeklyClaimed() {
        return weeklyClaimed;
    }

    public void setWeeklyClaimed(boolean weeklyClaimed) {
        this.weeklyClaimed = weeklyClaimed;
    }

    public int getTotalXp() {
        return totalXp;
    }

    public void setTotalXp(int totalXp) {
        this.totalXp = totalXp;
    }

    public BigDecimal getPendingMts() {
        return pendingMts;
    }

    public void setPendingMts(BigDecimal pendingMts) {
        this.pendingMts = pendingMts != null ? pendingMts : BigDecimal.ZERO;
    }
}
