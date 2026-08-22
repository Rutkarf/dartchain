package io.dartchain.backend.quests.application;

import io.dartchain.backend.auth.AuthService;
import io.dartchain.backend.auth.UserAccount;
import io.dartchain.backend.quests.dto.QuestProgressRequest;
import io.dartchain.backend.quests.dto.QuestCatalogResponse;
import io.dartchain.backend.quests.dto.QuestProgressResponse;
import io.dartchain.backend.quests.model.QuestProgressP2pChangedEvent;
import io.dartchain.backend.quests.model.QuestProgressState;
import io.dartchain.backend.quests.model.QuestTaskState;
import io.dartchain.backend.quests.persistence.QuestProgressStore;
import io.dartchain.backend.blockchain.application.BlockchainService;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.WeekFields;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

@Service
public class QuestService {

    private static final DateTimeFormatter DAY_KEY_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    private final AuthService authService;
    private final QuestProgressStore questProgressStore;
    private final BlockchainService blockchainService;
    private final ApplicationEventPublisher eventPublisher;

    public QuestService(
            AuthService authService,
            QuestProgressStore questProgressStore,
            BlockchainService blockchainService,
            ApplicationEventPublisher eventPublisher
    ) {
        this.authService = authService;
        this.questProgressStore = questProgressStore;
        this.blockchainService = blockchainService;
        this.eventPublisher = eventPublisher;
    }

    public QuestProgressResponse getState(String authorizationHeader) {
        UserAccount account = authService.requireAuthenticatedAccount(authorizationHeader);
        QuestProgressState state = loadNormalizedState(account.getId());
        return QuestProgressResponse.from(state);
    }

    public QuestCatalogResponse getCatalog() {
        return QuestCatalogUi.buildCatalog();
    }

    public QuestProgressResponse recordProgress(String authorizationHeader, QuestProgressRequest request) {
        UserAccount account = authService.requireAuthenticatedAccount(authorizationHeader);
        if (QuestCatalog.isServerHooked(request.taskId())) {
            throw new QuestException(
                    403,
                    "La progression de cette quête est validée automatiquement côté serveur"
            );
        }

        QuestProgressState state = applyTaskProgress(account, request.taskId(), request.increment(), true);
        return QuestProgressResponse.from(state);
    }

    public QuestProgressResponse recordBlockExplored(String authorizationHeader, int blockIndex) {
        UserAccount account = authService.requireAuthenticatedAccount(authorizationHeader);
        if (blockchainService.findBlockByIndex(blockIndex) == null) {
            throw new QuestException(404, "Bloc introuvable: #" + blockIndex);
        }

        QuestProgressState state = loadNormalizedState(account.getId());
        if (state.getExploredBlockIndices().contains(blockIndex)) {
            return QuestProgressResponse.from(state);
        }

        state.getExploredBlockIndices().add(blockIndex);

        QuestCatalog.DailyQuestDefinition definition = QuestCatalog.findDailyQuest("explore-blocks");
        if (definition == null) {
            throw new QuestException(400, "Quête inconnue: explore-blocks");
        }

        QuestTaskState task = state.getTasks().computeIfAbsent(
                definition.id(),
                ignored -> new QuestTaskState(0, false)
        );

        if (!task.isClaimed()) {
            task.setProgress(Math.min(definition.target(), task.getProgress() + 1));
            tryAutoClaimTask(account, state, definition, task);
        }

        saveAndPublish(account, state);
        return QuestProgressResponse.from(state);
    }

    /** Hook serveur : progression silencieuse par identifiant utilisateur. */
    public void recordProgressForUserId(String userId, String taskId, int increment) {
        if (userId == null || userId.isBlank()) {
            return;
        }

        authService.findAccountById(userId).ifPresent(account -> {
            try {
                applyTaskProgress(account, taskId, increment, false);
            } catch (RuntimeException ignored) {
                // Ne pas bloquer le flux métier (faucet, swap, auth…).
            }
        });
    }

    /**
     * Après liaison wallet : crédite les quêtes AUTO terminées mais non réclamées
     * (ex. daily-login avant création du wallet).
     */
    public void flushPendingAutoClaims(String userId) {
        if (userId == null || userId.isBlank()) {
            return;
        }

        authService.findAccountById(userId).ifPresent(account -> {
            if (account.getWalletAddress() == null || account.getWalletAddress().isBlank()) {
                return;
            }

            QuestProgressState state = loadNormalizedState(userId);
            boolean changed = false;

            for (QuestCatalog.DailyQuestDefinition definition : QuestCatalog.DAILY_QUESTS) {
                if (!QuestCatalog.isServerHooked(definition.id())) {
                    continue;
                }

                QuestTaskState task = state.getTasks().get(definition.id());
                if (task == null || task.isClaimed() || task.getProgress() < definition.target()) {
                    continue;
                }

                tryAutoClaimTask(account, state, definition, task);
                changed = true;
            }

            if (changed) {
                saveAndPublish(account, state);
            }
        });
    }

    /**
     * Quête faucet : progression + XP sans second mint on-chain
     * (le faucet a déjà crédité le wallet via {@code FAUCET_CLAIM}).
     */
    public void completeFaucetClaimQuest(String userId) {
        if (userId == null || userId.isBlank()) {
            return;
        }

        authService.findAccountById(userId).ifPresent(account -> {
            try {
                applyFaucetQuestCompletion(account);
            } catch (RuntimeException ignored) {
                // Ne pas bloquer le flux faucet.
            }
        });
    }

    /** Hook serveur : progression silencieuse via wallet lié à un compte. */
    public void recordProgressForWallet(String walletAddress, String taskId, int increment) {
        if (walletAddress == null || walletAddress.isBlank()) {
            return;
        }

        authService.findAccountByWalletAddress(walletAddress).ifPresent(account -> {
            try {
                applyTaskProgress(account, taskId, increment, false);
            } catch (RuntimeException ignored) {
                // Ne pas bloquer le flux métier.
            }
        });
    }

    public QuestProgressResponse claimTask(String authorizationHeader, String taskId) {
        UserAccount account = authService.requireAuthenticatedAccount(authorizationHeader);
        QuestCatalog.DailyQuestDefinition definition = QuestCatalog.findDailyQuest(taskId);
        if (definition == null) {
            throw new QuestException(400, "Quête inconnue: " + taskId);
        }

        QuestProgressState state = loadNormalizedState(account.getId());
        QuestTaskState task = state.getTasks().computeIfAbsent(
                definition.id(),
                ignored -> new QuestTaskState(0, false)
        );

        if (task.isClaimed()) {
            throw new QuestException(409, "Récompense déjà réclamée");
        }

        if (task.getProgress() < definition.target()) {
            throw new QuestException(400, "Quête non terminée");
        }

        task.setClaimed(true);
        mintQuestReward(account, definition.rewardMts(), "QUEST_TASK:" + definition.id());
        state.setPendingMts(state.getPendingMts().add(definition.rewardMts()));
        state.setTotalXp(state.getTotalXp() + definition.rewardXp());

        saveAndPublish(account, state);
        return QuestProgressResponse.from(state);
    }

    public QuestProgressResponse claimMission(String authorizationHeader) {
        UserAccount account = authService.requireAuthenticatedAccount(authorizationHeader);
        QuestProgressState state = loadNormalizedState(account.getId());

        if (state.isMissionClaimed()) {
            throw new QuestException(409, "Mission déjà réclamée");
        }

        if (missionProgress(state) < 100) {
            throw new QuestException(400, "Mission non terminée");
        }

        state.setMissionClaimed(true);
        mintQuestReward(account, QuestCatalog.MISSION_REWARD_MTS, "QUEST_MISSION");
        state.setPendingMts(state.getPendingMts().add(QuestCatalog.MISSION_REWARD_MTS));
        state.setTotalXp(state.getTotalXp() + QuestCatalog.MISSION_REWARD_XP);

        saveAndPublish(account, state);
        return QuestProgressResponse.from(state);
    }

    public QuestProgressResponse claimWeekly(String authorizationHeader) {
        UserAccount account = authService.requireAuthenticatedAccount(authorizationHeader);
        QuestProgressState state = loadNormalizedState(account.getId());

        if (state.isWeeklyClaimed()) {
            throw new QuestException(409, "Récompense hebdomadaire déjà réclamée");
        }

        if (!allDailyClaimed(state)) {
            throw new QuestException(400, "Toutes les quêtes quotidiennes doivent être réclamées");
        }

        state.setWeeklyClaimed(true);
        mintQuestReward(account, QuestCatalog.WEEKLY_REWARD_MTS, "QUEST_WEEKLY");
        state.setPendingMts(state.getPendingMts().add(QuestCatalog.WEEKLY_REWARD_MTS));

        saveAndPublish(account, state);
        return QuestProgressResponse.from(state);
    }

    private QuestProgressState applyTaskProgress(
            UserAccount account,
            String taskId,
            int increment,
            boolean failOnUnknownTask
    ) {
        QuestCatalog.DailyQuestDefinition definition = QuestCatalog.findDailyQuest(taskId);
        if (definition == null) {
            if (failOnUnknownTask) {
                throw new QuestException(400, "Quête inconnue: " + taskId);
            }
            return loadNormalizedState(account.getId());
        }

        QuestProgressState state = loadNormalizedState(account.getId());
        QuestTaskState task = state.getTasks().computeIfAbsent(
                definition.id(),
                ignored -> new QuestTaskState(0, false)
        );

        if (!task.isClaimed()) {
            int safeIncrement = Math.max(1, increment);
            task.setProgress(Math.min(definition.target(), task.getProgress() + safeIncrement));
            tryAutoClaimTask(account, state, definition, task);
        }

        saveAndPublish(account, state);
        return state;
    }

    private void mintQuestReward(UserAccount account, BigDecimal amount, String payload) {
        String walletAddress = account.getWalletAddress();
        if (walletAddress == null || walletAddress.isBlank()) {
            throw new QuestException(400, "Wallet requis pour recevoir la récompense R4V3");
        }

        blockchainService.mintSystemCredit(walletAddress, amount, payload);
    }

    private void applyFaucetQuestCompletion(UserAccount account) {
        QuestCatalog.DailyQuestDefinition definition = QuestCatalog.FAUCET_CLAIM;
        QuestProgressState state = loadNormalizedState(account.getId());
        QuestTaskState task = state.getTasks().computeIfAbsent(
                definition.id(),
                ignored -> new QuestTaskState(0, false)
        );

        if (!task.isClaimed()) {
            task.setProgress(Math.min(definition.target(), task.getProgress() + 1));
        }

        if (task.isClaimed() || task.getProgress() < definition.target()) {
            saveAndPublish(account, state);
            return;
        }

        completeServerHookedTaskWithoutMint(account, state, definition, task);
        saveAndPublish(account, state);
    }

    private void tryAutoClaimTask(
            UserAccount account,
            QuestProgressState state,
            QuestCatalog.DailyQuestDefinition definition,
            QuestTaskState task
    ) {
        if (task.isClaimed() || task.getProgress() < definition.target()) {
            return;
        }

        String walletAddress = account.getWalletAddress();
        if (walletAddress == null || walletAddress.isBlank()) {
            return;
        }

        task.setClaimed(true);
        blockchainService.mintSystemCredit(walletAddress, definition.rewardMts(), "QUEST_TASK:" + definition.id());
        state.setPendingMts(state.getPendingMts().add(definition.rewardMts()));
        state.setTotalXp(state.getTotalXp() + definition.rewardXp());
    }

    private void completeServerHookedTaskWithoutMint(
            UserAccount account,
            QuestProgressState state,
            QuestCatalog.DailyQuestDefinition definition,
            QuestTaskState task
    ) {
        if (task.isClaimed() || task.getProgress() < definition.target()) {
            return;
        }

        task.setClaimed(true);
        state.setTotalXp(state.getTotalXp() + definition.rewardXp());
    }

    private QuestProgressState loadNormalizedState(String userId) {
        String dayKey = todayKey();
        String weekKey = weekKey();

        QuestProgressState state = questProgressStore.findByUserId(userId)
                .orElseGet(() -> createDefaultState(dayKey, weekKey));

        boolean changed = false;

        if (!dayKey.equals(state.getDayKey())) {
            int totalXp = state.getTotalXp();
            BigDecimal pendingMts = state.getPendingMts();
            boolean weeklyClaimed = weekKey.equals(state.getWeekKey()) && state.isWeeklyClaimed();

            state = createDefaultState(dayKey, weekKey);
            state.setWeeklyClaimed(weeklyClaimed);
            state.setTotalXp(totalXp);
            state.setPendingMts(pendingMts);
            changed = true;
        } else if (!weekKey.equals(state.getWeekKey())) {
            state.setWeekKey(weekKey);
            state.setWeeklyClaimed(false);
            changed = true;
        }

        if (changed) {
            questProgressStore.save(userId, state);
        }

        return state;
    }

    /**
     * Synchronise la progression quests entre nœuds P2P.
     *
     * On fusionne uniquement l'état off-chain (pas de mint on-chain) pour éviter les doubles crédits.
     */
    public void syncQuestProgressForWallet(String walletAddress, QuestProgressState incomingState) {
        if (walletAddress == null || walletAddress.isBlank() || incomingState == null) {
            return;
        }

        authService.findAccountByWalletAddress(walletAddress).ifPresent(account -> {
            QuestProgressState local = loadNormalizedState(account.getId());

            // totalXp / pendingMts sont cumulatives : on prend le max sans condition.
            if (incomingState.getTotalXp() > local.getTotalXp()) {
                local.setTotalXp(incomingState.getTotalXp());
            }
            if (incomingState.getPendingMts() != null && incomingState.getPendingMts().compareTo(local.getPendingMts()) > 0) {
                local.setPendingMts(incomingState.getPendingMts());
            }

            boolean dayMatches = incomingState.getDayKey() != null && incomingState.getDayKey().equals(local.getDayKey());
            boolean weekMatches = incomingState.getWeekKey() != null && incomingState.getWeekKey().equals(local.getWeekKey());

            if (dayMatches) {
                local.setMissionClaimed(local.isMissionClaimed() || incomingState.isMissionClaimed());

                if (incomingState.getTasks() != null) {
                    for (QuestCatalog.DailyQuestDefinition definition : QuestCatalog.DAILY_QUESTS) {
                        QuestTaskState remoteTask = incomingState.getTasks().get(definition.id());
                        if (remoteTask == null) continue;

                        QuestTaskState localTask = local.getTasks().get(definition.id());
                        if (localTask == null) {
                            localTask = new QuestTaskState(0, false);
                            local.getTasks().put(definition.id(), localTask);
                        }

                        if (remoteTask.getProgress() > localTask.getProgress()) {
                            localTask.setProgress(Math.min(definition.target(), remoteTask.getProgress()));
                        }

                        if (remoteTask.isClaimed()) {
                            localTask.setClaimed(true);
                            localTask.setProgress(Math.max(localTask.getProgress(), definition.target()));
                        }
                    }
                }

                // exploredBlockIndices = union (sans doublons)
                if (incomingState.getExploredBlockIndices() != null) {
                    java.util.LinkedHashSet<Integer> union = new java.util.LinkedHashSet<>(local.getExploredBlockIndices());
                    for (Integer idx : incomingState.getExploredBlockIndices()) {
                        if (idx == null) continue;
                        union.add(idx);
                    }
                    local.setExploredBlockIndices(new java.util.ArrayList<>(union));
                }
            }

            if (weekMatches && incomingState.isWeeklyClaimed()) {
                local.setWeeklyClaimed(true);
            }

            questProgressStore.save(account.getId(), local);
        });
    }

    private void saveAndPublish(UserAccount account, QuestProgressState state) {
        if (account == null || state == null) {
            return;
        }

        questProgressStore.save(account.getId(), state);

        String walletAddress = account.getWalletAddress();
        if (walletAddress == null || walletAddress.isBlank()) {
            return;
        }

        // Important : pas de clone deep (state n'est plus modifié dans le scope immédiat).
        eventPublisher.publishEvent(new QuestProgressP2pChangedEvent(walletAddress, state));
    }

    private QuestProgressState createDefaultState(String dayKey, String weekKey) {
        QuestProgressState state = new QuestProgressState();
        state.setDayKey(dayKey);
        state.setWeekKey(weekKey);
        state.setMissionClaimed(false);
        state.setWeeklyClaimed(false);
        state.setTotalXp(0);
        state.setPendingMts(BigDecimal.ZERO);
        state.setExploredBlockIndices(new ArrayList<>());

        Map<String, QuestTaskState> tasks = new LinkedHashMap<>();
        for (QuestCatalog.DailyQuestDefinition quest : QuestCatalog.DAILY_QUESTS) {
            tasks.put(quest.id(), new QuestTaskState(0, false));
        }
        state.setTasks(tasks);
        return state;
    }

    private int missionProgress(QuestProgressState state) {
        if (QuestCatalog.DAILY_QUESTS.isEmpty()) {
            return 0;
        }

        double ratio = QuestCatalog.DAILY_QUESTS.stream()
                .mapToDouble(quest -> {
                    QuestTaskState task = state.getTasks().getOrDefault(
                            quest.id(),
                            new QuestTaskState(0, false)
                    );
                    return Math.min((double) task.getProgress() / quest.target(), 1.0);
                })
                .sum() / QuestCatalog.DAILY_QUESTS.size();

        return (int) Math.round(ratio * 100);
    }

    private boolean allDailyClaimed(QuestProgressState state) {
        return QuestCatalog.DAILY_QUESTS.stream()
                .allMatch(quest -> {
                    QuestTaskState task = state.getTasks().get(quest.id());
                    return task != null && task.isClaimed();
                });
    }

    private String todayKey() {
        return LocalDate.now().format(DAY_KEY_FORMAT);
    }

    private String weekKey() {
        LocalDate now = LocalDate.now();
        WeekFields weekFields = WeekFields.of(Locale.getDefault());
        int weekYear = now.get(weekFields.weekBasedYear());
        int week = now.get(weekFields.weekOfWeekBasedYear());
        return String.format(Locale.ROOT, "%04d-W%02d", weekYear, week);
    }
}
