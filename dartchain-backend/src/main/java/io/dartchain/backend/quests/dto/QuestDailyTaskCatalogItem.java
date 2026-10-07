package io.dartchain.backend.quests.dto;

import java.math.BigDecimal;

public record QuestDailyTaskCatalogItem(
        String id,
        String title,
        String description,
        int target,
        BigDecimal rewardMts,
        int rewardXp,
        String action,
        boolean serverHooked
) {
}
