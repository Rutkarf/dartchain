package io.dartchain.backend.quests.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record QuestProgressRequest(
        @NotBlank
        String taskId,

        @Min(1)
        int increment
) {
    public QuestProgressRequest {
        if (increment <= 0) {
            increment = 1;
        }
    }
}
