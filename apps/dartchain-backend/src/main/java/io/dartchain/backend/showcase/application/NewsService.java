package io.dartchain.backend.showcase.application;

import io.dartchain.backend.blockchain.dto.PendingTransactionResponse;
import io.dartchain.backend.blockchain.model.Block;
import io.dartchain.backend.blockchain.application.BlockchainService;
import io.dartchain.backend.blockchain.application.PendingTransactionService;
import io.dartchain.backend.showcase.dto.NewsFeedResponse;
import io.dartchain.backend.showcase.dto.NewsItemResponse;
import io.dartchain.backend.showcase.model.NewsItem;
import io.dartchain.backend.showcase.model.NewsSource;
import io.dartchain.backend.showcase.news.store.NewsItemStore;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.stream.Collectors;

@Service
public class NewsService {

    private static final int MAX_ITEMS = 60;
    private static final List<String> ALL_CATEGORIES = List.of(
            "Réseau", "R4V3", "Peers", "Écosystème"
    );

    private final CopyOnWriteArrayList<NewsItem> items = new CopyOnWriteArrayList<>();
    private final BlockchainService blockchainService;
    private final PendingTransactionService pendingTransactionService;
    private final NewsItemStore newsItemStore;

    private volatile String lastFeaturedId;

    public NewsService(
            BlockchainService blockchainService,
            PendingTransactionService pendingTransactionService,
            NewsItemStore newsItemStore
    ) {
        this.blockchainService = blockchainService;
        this.pendingTransactionService = pendingTransactionService;
        this.newsItemStore = newsItemStore;
    }

    @PostConstruct
    public void seedEditorialNews() {
        List<NewsItem> persisted = newsItemStore.findAllPersisted();
        if (!persisted.isEmpty()) {
            items.clear();
            items.addAll(persisted);
            refreshChainNews();
            return;
        }

        Instant now = Instant.now();

        items.add(editorial(
                "editorial-1",
                "Réseau",
                "Bienvenue sur Dart Explorer",
                "Explore la chaîne R4V3 en temps réel.",
                "Dart Explorer agrège les blocs, transactions pending et activité réseau. "
                        + "Utilise les onglets du dock pour miner, consulter la chaîne et gérer tes peers.",
                now.minus(Duration.ofMinutes(2)),
                "NONE",
                null
        ));
        items.add(editorial(
                "editorial-2",
                "R4V3",
                "Volume R4V3 en hausse sur 24h",
                "Activité accrue sur la paire R4V3 / CHF.",
                "Le panneau taux et le swap permettent de suivre l'évolution du token natif R4V3 "
                        + "et de simuler des échanges depuis le bandeau marché.",
                now.minus(Duration.ofMinutes(14)),
                "NONE",
                null
        ));
        items.add(editorial(
                "editorial-3",
                "Peers",
                "Synchronisation multi-nœuds",
                "Connecte des peers pour propager la chaîne.",
                "Ouvre le panneau Peers dans le dock pour ajouter des nœuds et synchroniser "
                        + "ta copie locale de la blockchain avec le réseau.",
                now.minus(Duration.ofHours(1)),
                "OPEN_PEERS",
                null
        ));
        items.add(editorial(
                "editorial-4",
                "Écosystème",
                "Faucet actif — claim R4V3 testnet",
                "Récupère des jetons pour tester les transactions.",
                "Le faucet distribue des R4V3 de test pour alimenter ton wallet et expérimenter "
                        + "les envois, le minage et les swaps sans risque.",
                now.minus(Duration.ofHours(3)),
                "OPEN_FAUCET",
                null
        ));
        items.add(editorial(
                "editorial-5",
                "Réseau",
                "Proof-of-work difficulté 4",
                "Chaque bloc respecte la règle des zéros en tête.",
                "La difficulté actuelle impose que le hash des blocs commence par quatre zéros. "
                        + "Mine les transactions pending pour valider la chaîne.",
                now.minus(Duration.ofHours(5)),
                "OPEN_PENDING",
                null
        ));
        items.add(editorial(
                "editorial-6",
                "R4V3",
                "Exchange panel R4V3 ↔ launch tokens",
                "Simule des swaps depuis le panneau gauche.",
                "Le panneau d'échange en haut de l'écran permet de convertir entre R4V3 et "
                        + "d'autres actifs avec estimation en temps réel.",
                now.minus(Duration.ofHours(8)),
                "OPEN_SWAP",
                null
        ));
        items.add(editorial(
                "editorial-7",
                "Écosystème",
                "LaunchLab — déployer un token testnet",
                "Crée un actif custom sur la chaîne R4V3.",
                "LaunchLab permet de configurer un token, le déployer en testnet et le retrouver "
                        + "dans l'onglet dédié du showcase.",
                now.minus(Duration.ofHours(12)),
                "NONE",
                null
        ));
        items.add(editorial(
                "editorial-8",
                "Réseau",
                "Explorer les blocs minés",
                "Consulte l'historique depuis le dock.",
                "Chaque bloc miné apparaît dans le dock Blocks. Clique une news réseau pour "
                        + "ouvrir le détail du bloc associé.",
                now.minus(Duration.ofHours(18)),
                "NONE",
                null
        ));
        items.add(editorial(
                "editorial-9",
                "Peers",
                "Statut réseau en direct",
                "Le bandeau NEWS reflète l'activité chaîne.",
                "Les événements réseau, blocs minés et peers apparaissent automatiquement "
                        + "dans le fil NEWS avec horodatage relatif.",
                now.minus(Duration.ofHours(24)),
                "NONE",
                null
        ));

        List<NewsItem> editorialItems = items.stream()
                .filter(item -> item.getSource() == NewsSource.EDITORIAL)
                .toList();
        newsItemStore.saveAll(editorialItems);
        refreshChainNews();
    }

    public NewsFeedResponse getFeed(String category, String source, int limit, int offset) {
        refreshChainNews();

        List<NewsItem> sorted = items.stream()
                .sorted(Comparator.comparing(NewsItem::getPublishedAt).reversed())
                .filter(item -> matchesCategory(item, category))
                .filter(item -> matchesSource(item, source))
                .collect(Collectors.toList());

        int safeLimit = Math.max(1, Math.min(limit, MAX_ITEMS));
        int safeOffset = Math.max(0, offset);
        int totalCount = sorted.size();

        String featuredId = resolveFeaturedId(sorted);

        List<NewsItemResponse> page = sorted.stream()
                .skip(safeOffset)
                .limit(safeLimit)
                .map(item -> toResponse(item, item.getId().equals(featuredId)))
                .collect(Collectors.toList());

        boolean hasMore = safeOffset + page.size() < totalCount;

        return new NewsFeedResponse(
                "DartChain",
                buildLastTransactionLabel(),
                featuredId,
                page,
                ALL_CATEGORIES,
                buildLiveActivity(),
                Instant.now().toString(),
                totalCount,
                hasMore
        );
    }

    public Optional<NewsItemResponse> getById(String id) {
        refreshChainNews();

        return items.stream()
                .filter(item -> item.getId().equals(id))
                .findFirst()
                .map(item -> toResponse(item, item.getId().equals(lastFeaturedId)));
    }

    public synchronized void publishSwapEvent(String walletAddress, io.dartchain.backend.exchange.dto.ExchangeSwapResponse swap) {
        Instant now = Instant.now();
        String id = "swap-" + System.currentTimeMillis();
        String summary = swap.fromToken()
                + " → "
                + swap.toToken()
                + " · "
                + (swap.amountIn() != null ? swap.amountIn().stripTrailingZeros().toPlainString() : "0")
                + " → "
                + (swap.amountOut() != null ? swap.amountOut().stripTrailingZeros().toPlainString() : "0");

        List<String> previousSwapIds = items.stream()
                .filter(item -> item.getId().startsWith("swap-") && item.getId().length() > 20)
                .map(NewsItem::getId)
                .toList();
        items.removeIf(item -> previousSwapIds.contains(item.getId()));
        previousSwapIds.forEach(newsItemStore::deleteById);

        NewsItem swapItem = editorial(
                id,
                "R4V3",
                "Swap testnet exécuté",
                summary,
                "Wallet "
                        + truncate(walletAddress, 12)
                        + " a échangé "
                        + (swap.amountIn() != null ? swap.amountIn().stripTrailingZeros().toPlainString() : "0")
                        + " "
                        + swap.fromToken()
                        + " contre "
                        + (swap.amountOut() != null ? swap.amountOut().stripTrailingZeros().toPlainString() : "0")
                        + " "
                        + swap.toToken()
                        + " sur le simulateur R4V3chainz testnet.",
                now,
                "OPEN_SWAP",
                swap.toToken()
        );

        items.add(swapItem);
        newsItemStore.save(swapItem);

        lastFeaturedId = id;

        while (items.size() > MAX_ITEMS) {
            items.remove(items.size() - 1);
        }
    }

    public synchronized void refreshChainNews() {
        removeChainItems();

        Instant now = Instant.now();
        List<Block> blocks = blockchainService.getBlocks();

        if (!blocks.isEmpty()) {
            Block latest = blocks.get(blocks.size() - 1);
            String blockId = "chain-block-" + latest.getIndex();
            items.add(chainNews(
                    blockId,
                    "Réseau",
                    "Bloc #" + latest.getIndex() + " ajouté à la chaîne",
                    "Hash " + truncate(latest.getHash(), 16),
                    "Le bloc #" + latest.getIndex() + " a été miné avec le hash "
                            + safe(latest.getHash()) + ". Nonce : " + latest.getNonce()
                            + ", difficulté : " + latest.getDifficulty() + ".",
                    now.minus(Duration.ofMinutes(1)),
                    "VIEW_BLOCK",
                    String.valueOf(latest.getIndex())
            ));
            lastFeaturedId = blockId;
        }

        List<PendingTransactionResponse> pending = pendingTransactionService.getPendingTransactions();

        if (!pending.isEmpty()) {
            PendingTransactionResponse latest = pending.get(0);
            items.add(chainNews(
                    "chain-pending-" + safe(latest.getId()),
                    "Réseau",
                    "Transaction pending : " + formatTx(latest),
                    "En attente de minage",
                    "Transaction de " + safe(latest.getFromAddress()) + " vers "
                            + safe(latest.getToAddress()) + " pour "
                            + (latest.getAmount() != null
                            ? latest.getAmount().stripTrailingZeros().toPlainString()
                            : "0")
                            + " R4V3. ID : " + safe(latest.getId()) + ".",
                    now.minus(Duration.ofSeconds(30)),
                    "VIEW_PENDING",
                    safe(latest.getId())
            ));
        }

        int peerHint = Math.min(3, Math.max(1, blocks.size()));
        items.add(chainNews(
                "chain-peers-" + blocks.size(),
                "Peers",
                peerHint + " nœud(s) peuvent synchroniser la chaîne",
                "Utilise le panneau Peers pour te connecter",
                "La chaîne compte " + blocks.size() + " bloc(s). Connecte "
                        + peerHint + " peer(s) ou plus pour propager les blocs.",
                now.minus(Duration.ofMinutes(45)),
                "OPEN_PEERS",
                null
        ));

        if (lastFeaturedId == null && !items.isEmpty()) {
            lastFeaturedId = items.get(0).getId();
        }
    }

    private void removeChainItems() {
        items.removeIf(item -> item.getSource() == NewsSource.CHAIN);
    }

    private boolean matchesCategory(NewsItem item, String category) {
        if (category == null || category.isBlank() || "all".equalsIgnoreCase(category)) {
            return true;
        }
        return item.getCategory().equalsIgnoreCase(category);
    }

    private boolean matchesSource(NewsItem item, String source) {
        if (source == null || source.isBlank() || "all".equalsIgnoreCase(source)) {
            return true;
        }
        return item.getSource().name().equalsIgnoreCase(source);
    }

    private String resolveFeaturedId(List<NewsItem> sorted) {
        if (lastFeaturedId != null) {
            boolean exists = sorted.stream().anyMatch(item -> item.getId().equals(lastFeaturedId));
            if (exists) {
                return lastFeaturedId;
            }
        }

        return sorted.stream()
                .filter(item -> item.getSource() == NewsSource.CHAIN)
                .map(NewsItem::getId)
                .findFirst()
                .orElse(sorted.isEmpty() ? null : sorted.get(0).getId());
    }

    private String buildLiveActivity() {
        List<Block> blocks = blockchainService.getBlocks();
        if (!blocks.isEmpty()) {
            Block latest = blocks.get(blocks.size() - 1);
            return "Bloc #" + latest.getIndex() + " · chaîne active";
        }
        return "Chaîne en attente de premier bloc";
    }

    private NewsItem editorial(
            String id,
            String category,
            String title,
            String summary,
            String body,
            Instant publishedAt,
            String actionType,
            String actionTarget
    ) {
        return new NewsItem(
                id,
                category,
                title,
                summary,
                body,
                publishedAt,
                NewsSource.EDITORIAL,
                actionType,
                actionTarget
        );
    }

    private NewsItem chainNews(
            String id,
            String category,
            String title,
            String summary,
            String body,
            Instant publishedAt,
            String actionType,
            String actionTarget
    ) {
        return new NewsItem(
                id,
                category,
                title,
                summary,
                body,
                publishedAt,
                NewsSource.CHAIN,
                actionType,
                actionTarget
        );
    }

    private NewsItemResponse toResponse(NewsItem item, boolean featured) {
        return new NewsItemResponse(
                item.getId(),
                item.getCategory(),
                item.getTitle(),
                item.getSummary(),
                item.getBody() != null ? item.getBody() : item.getSummary(),
                item.getPublishedAt().toString(),
                formatRelativeTime(item.getPublishedAt()),
                item.getSource().name(),
                item.getActionType() != null ? item.getActionType() : "NONE",
                item.getActionTarget(),
                featured
        );
    }

    private String buildLastTransactionLabel() {
        List<PendingTransactionResponse> pending = pendingTransactionService.getPendingTransactions();

        if (pending.isEmpty()) {
            return "Aucune transaction récente";
        }

        return formatTx(pending.get(0));
    }

    private String formatTx(PendingTransactionResponse tx) {
        return safe(tx.getFromAddress())
                + " → "
                + safe(tx.getToAddress())
                + " : "
                + (tx.getAmount() != null ? tx.getAmount().stripTrailingZeros().toPlainString() : "0");
    }

    private String formatRelativeTime(Instant publishedAt) {
        Duration delta = Duration.between(publishedAt, Instant.now());
        long minutes = delta.toMinutes();

        if (minutes < 1) {
            return "à l'instant";
        }
        if (minutes < 60) {
            return "il y a " + minutes + " min";
        }

        long hours = delta.toHours();
        if (hours < 24) {
            return "il y a " + hours + " h";
        }

        return "il y a " + delta.toDays() + " j";
    }

    private String truncate(String value, int max) {
        if (value == null || value.length() <= max) {
            return value != null ? value : "—";
        }
        return value.substring(0, max) + "…";
    }

    private String safe(String value) {
        return value == null ? "?" : value;
    }
}
