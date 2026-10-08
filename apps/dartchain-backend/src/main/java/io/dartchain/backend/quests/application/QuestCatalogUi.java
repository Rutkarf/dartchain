package io.dartchain.backend.quests.application;

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
                "Gardien du réseau",
                "Maintiens l’intégrité du réseau en terminant les tâches quotidiennes et hebdomadaires.",
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
            case "daily-login" -> "Connexion quotidienne";
            case "faucet-claim" -> "Réclamation du robinet";
            case "explore-blocks" -> "Explorer les blocs";
            case "swap-tokens" -> "Échanger des jetons";
            default -> taskId;
        };
    }

    private static String descriptionFor(String taskId) {
        return switch (taskId) {
            case "daily-login" -> "Connecte-toi à l’application";
            case "faucet-claim" -> "Réclame depuis le robinet";
            case "explore-blocks" -> "Ouvrir le détail d’un bloc dans l’explorateur";
            case "swap-tokens" ->
                    "Échanger un jeton du laboratoire (hors paires BTC/ETH standard) via le panneau d’échange";
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
