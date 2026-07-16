package io.dartchain.backend.quests;

import io.dartchain.backend.quests.dto.QuestCatalogResponse;
import io.dartchain.backend.quests.dto.QuestDailyTaskCatalogItem;
import io.dartchain.backend.quests.dto.QuestMissionCatalogItem;
import io.dartchain.backend.quests.dto.QuestWeeklyCatalogItem;

import java.util.List;

/**
 * Métadonnées UI du catalogue quêtes — source unique alignée avec le frontend.
 */
public final class QuestCatalogUi {

    public static final String MISSION_ID = "network-guardian";

    private QuestCatalogUi() {
    }

    public static QuestCatalogResponse buildCatalog() {
        List<QuestDailyTaskCatalogItem> dailyTasks = QuestCatalog.DAILY_QUESTS.stream()
                .map(definition -> new QuestDailyTaskCatalogItem(
                        definition.id(),
                        titleFor(definition.id()),
                        descriptionFor(definition.id()),
                        definition.target(),
                        definition.rewardMts(),
                        definition.rewardXp(),
                        actionFor(definition.id()),
                        QuestCatalog.isServerHooked(definition.id())
                ))
                .toList();

        QuestMissionCatalogItem mission = new QuestMissionCatalogItem(
                MISSION_ID,
                "Network Guardian",
                "Maintain network integrity by completing daily and weekly tasks.",
                QuestCatalog.MISSION_REWARD_MTS,
                QuestCatalog.MISSION_REWARD_XP,
                100
        );

        QuestWeeklyCatalogItem weekly = new QuestWeeklyCatalogItem(
                QuestCatalog.WEEKLY_REWARD_MTS,
                20
        );

        return new QuestCatalogResponse(
                dailyTasks,
                mission,
                weekly,
                QuestCatalog.SERVER_HOOKED_TASK_IDS
        );
    }

    private static String titleFor(String taskId) {
        return switch (taskId) {
            case "daily-login" -> "Daily Login";
            case "faucet-claim" -> "Faucet Claim";
            case "explore-blocks" -> "Explore Blocks";
            case "swap-tokens" -> "Swap Tokens";
            default -> taskId;
        };
    }

    private static String descriptionFor(String taskId) {
        return switch (taskId) {
            case "daily-login" -> "Log in to the app";
            case "faucet-claim" -> "Claim from the faucet";
            case "explore-blocks" -> "Ouvrir les détails d’un bloc via Explore Block";
            case "swap-tokens" ->
                    "Swapper un token LaunchLab (hors paires BTC/ETH standard) via le panneau Swap";
            default -> "";
        };
    }

    private static String actionFor(String taskId) {
        return switch (taskId) {
            case "daily-login" -> "login";
            case "faucet-claim" -> "faucet";
            case "explore-blocks" -> "explore-blocks";
            case "swap-tokens" -> "swap";
            default -> "none";
        };
    }
}
