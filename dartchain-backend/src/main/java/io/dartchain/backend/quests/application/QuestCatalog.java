package io.dartchain.backend.quests.application;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;

public final class QuestCatalog {

    public static final Set<String> SERVER_HOOKED_TASK_IDS = Set.of(
            "daily-login",
            "faucet-claim",
            "explore-blocks",
            "swap-tokens"
    );

    public static boolean isServerHooked(String taskId) {
        return taskId != null && SERVER_HOOKED_TASK_IDS.contains(taskId);
    }

    public record DailyQuestDefinition(
            String id,
            int target,
            BigDecimal rewardMts,
            int rewardXp
    ) {
    }

    public static final DailyQuestDefinition DAILY_LOGIN =
            new DailyQuestDefinition("daily-login", 1, new BigDecimal("1.00"), 10);

    public static final DailyQuestDefinition FAUCET_CLAIM =
            new DailyQuestDefinition("faucet-claim", 1, new BigDecimal("1.00"), 15);

    public static final DailyQuestDefinition EXPLORE_BLOCKS =
            new DailyQuestDefinition("explore-blocks", 5, new BigDecimal("1.00"), 20);

    public static final DailyQuestDefinition SWAP_TOKENS =
            new DailyQuestDefinition("swap-tokens", 10, new BigDecimal("1.00"), 25);

    public static final List<DailyQuestDefinition> DAILY_QUESTS = List.of(
            DAILY_LOGIN,
            FAUCET_CLAIM,
            EXPLORE_BLOCKS,
            SWAP_TOKENS
    );

    public static final BigDecimal MISSION_REWARD_MTS = new BigDecimal("1.00");
    public static final int MISSION_REWARD_XP = 150;

    public static final BigDecimal WEEKLY_REWARD_MTS = new BigDecimal("1.00");

    private QuestCatalog() {
    }

    public static DailyQuestDefinition findDailyQuest(String taskId) {
        return DAILY_QUESTS.stream()
                .filter(quest -> quest.id().equals(taskId))
                .findFirst()
                .orElse(null);
    }
}
