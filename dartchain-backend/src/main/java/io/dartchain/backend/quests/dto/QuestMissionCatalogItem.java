package io.dartchain.backend.quests.dto;

import java.math.BigDecimal;

public record QuestMissionCatalogItem(
        String id,
        String title,
        String description,
        BigDecimal rewardMts,
        int rewardXp,
        int progressTarget
) {
}
