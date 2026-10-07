package io.dartchain.backend.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "quest_progress")
public class QuestProgressEntity {

    @Id
    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "day_key", nullable = false, length = 10)
    private String dayKey;

    @Column(name = "week_key", nullable = false, length = 8)
    private String weekKey;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "tasks_json", nullable = false)
    private String tasksJson;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "explored_blocks_json", nullable = false)
    private String exploredBlocksJson;

    @Column(name = "mission_claimed", nullable = false)
    private boolean missionClaimed;

    @Column(name = "weekly_claimed", nullable = false)
    private boolean weeklyClaimed;

    @Column(name = "total_xp", nullable = false)
    private int totalXp;

    @Column(name = "pending_mts", nullable = false, precision = 18, scale = 2)
    private BigDecimal pendingMts;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

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

    public String getTasksJson() {
        return tasksJson;
    }

    public void setTasksJson(String tasksJson) {
        this.tasksJson = tasksJson;
    }

    public String getExploredBlocksJson() {
        return exploredBlocksJson;
    }

    public void setExploredBlocksJson(String exploredBlocksJson) {
        this.exploredBlocksJson = exploredBlocksJson;
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
        this.pendingMts = pendingMts;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
