package io.dartchain.backend.quests.dto;

import java.math.BigDecimal;

public record QuestWeeklyCatalogItem(
        BigDecimal rewardMts,
        int xpBoostPercent
) {
}
