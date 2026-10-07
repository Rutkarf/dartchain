package io.dartchain.backend.quests.dto;

import io.dartchain.backend.quests.model.QuestProgressState;
import io.dartchain.backend.quests.model.QuestTaskState;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public record QuestProgressResponse(
        String dayKey,
        Map<String, QuestTaskResponse> tasks,
        boolean missionClaimed,
        boolean weeklyClaimed,
        int totalXp,
        BigDecimal pendingMts,
        List<Integer> exploredBlockIndices
) {
    public static QuestProgressResponse from(QuestProgressState state) {
        Map<String, QuestTaskResponse> tasks = new LinkedHashMap<>();
        for (Map.Entry<String, QuestTaskState> entry : state.getTasks().entrySet()) {
            QuestTaskState task = entry.getValue();
            tasks.put(
                    entry.getKey(),
                    new QuestTaskResponse(task.getProgress(), task.isClaimed())
            );
        }

        List<Integer> explored = state.getExploredBlockIndices() != null
                ? new ArrayList<>(state.getExploredBlockIndices())
                : List.of();

        return new QuestProgressResponse(
                state.getDayKey(),
                tasks,
                state.isMissionClaimed(),
                state.isWeeklyClaimed(),
                state.getTotalXp(),
                state.getPendingMts(),
                explored
        );
    }
}
