package io.dartchain.backend.quests.dto;

public record QuestTaskResponse(
        int progress,
        boolean claimed
) {
}
