package io.dartchain.backend.explorer.application;

import io.dartchain.backend.explorer.dto.ExplorerSearchResultDto;
import io.dartchain.backend.explorer.dto.ExplorerSearchResponse;
import io.dartchain.backend.blockchain.model.Block;
import io.dartchain.backend.blockchain.model.Transaction;
import io.dartchain.backend.blockchain.application.BlockchainService;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
public class ExplorerSearchService {

    private static final int MAX_RESULTS = 12;

    private final BlockchainService blockchainService;

    public ExplorerSearchService(BlockchainService blockchainService) {
        this.blockchainService = blockchainService;
    }

    public ExplorerSearchResponse search(String rawQuery) {
        String query = rawQuery == null ? "" : rawQuery.trim();
        if (query.isEmpty()) {
            return new ExplorerSearchResponse(query, List.of());
        }

        String normalized = query.toLowerCase(Locale.ROOT);
        List<ExplorerSearchResultDto> results = new ArrayList<>();

        searchBlocks(normalized, query, results);
        searchPendingTransactions(normalized, results);
        searchAddresses(normalized, query, results);

        if (results.size() > MAX_RESULTS) {
            return new ExplorerSearchResponse(query, List.copyOf(results.subList(0, MAX_RESULTS)));
        }

        return new ExplorerSearchResponse(query, results);
    }

    private void searchBlocks(String normalized, String originalQuery, List<ExplorerSearchResultDto> results) {
        for (Block block : blockchainService.getBlocks()) {
            if (results.size() >= MAX_RESULTS) {
                return;
            }

            if (matchesBlockIndex(block, originalQuery)) {
                results.add(blockResult(block, "Correspondance par index"));
                continue;
            }

            if (contains(block.getHash(), normalized)) {
                results.add(blockResult(block, "Hash du bloc"));
                continue;
            }

            if (contains(block.getPreviousHash(), normalized)) {
                results.add(blockResult(block, "Hash précédent"));
                continue;
            }

            if (contains(block.getData(), normalized)) {
                results.add(blockResult(block, "Données du bloc"));
                continue;
            }

            for (Transaction tx : block.getTransactions()) {
                if (results.size() >= MAX_RESULTS) {
                    return;
                }

                if (matchesTransaction(tx, normalized)) {
                    results.add(transactionResult(tx, block, false));
                }
            }
        }
    }

    private void searchPendingTransactions(String normalized, List<ExplorerSearchResultDto> results) {
        for (Transaction tx : blockchainService.getPendingTransactions()) {
            if (results.size() >= MAX_RESULTS) {
                return;
            }

            if (matchesTransaction(tx, normalized)) {
                results.add(transactionResult(tx, null, true));
            }
        }
    }

    private void searchAddresses(String normalized, String originalQuery, List<ExplorerSearchResultDto> results) {
        if (originalQuery.length() < 4) {
            return;
        }

        boolean addressMatch = false;

        for (Block block : blockchainService.getBlocks()) {
            for (Transaction tx : block.getTransactions()) {
                if (contains(tx.getSender(), normalized) || contains(tx.getRecipient(), normalized)) {
                    addressMatch = true;
                    break;
                }
            }
            if (addressMatch) {
                break;
            }
        }

        for (Transaction tx : blockchainService.getPendingTransactions()) {
            if (contains(tx.getSender(), normalized) || contains(tx.getRecipient(), normalized)) {
                addressMatch = true;
                break;
            }
        }

        if (!addressMatch && !looksLikeAddress(originalQuery)) {
            return;
        }

        try {
            BigDecimal balance = blockchainService.getBalance(originalQuery);
            results.add(new ExplorerSearchResultDto(
                    "ADDRESS",
                    "Adresse " + shorten(originalQuery, 10, 6),
                    "Solde : " + balance.toPlainString() + " R4V3",
                    null,
                    null,
                    null,
                    originalQuery,
                    balance
            ));
        } catch (Exception ignored) {
            // ignore invalid addresses
        }
    }

    private ExplorerSearchResultDto blockResult(Block block, String subtitle) {
        return new ExplorerSearchResultDto(
                "BLOCK",
                "Bloc #" + block.getIndex(),
                subtitle,
                block.getIndex(),
                block.getHash(),
                null,
                null,
                null
        );
    }

    private ExplorerSearchResultDto transactionResult(Transaction tx, Block block, boolean pending) {
        String label = pending ? "TX en attente" : "Transaction";
        String subtitle = buildTransactionSubtitle(tx, block, pending);

        return new ExplorerSearchResultDto(
                pending ? "PENDING" : "TRANSACTION",
                label,
                subtitle,
                block != null ? block.getIndex() : null,
                block != null ? block.getHash() : null,
                tx.getId() != null ? tx.getId() : tx.getHash(),
                null,
                null
        );
    }

    private String buildTransactionSubtitle(Transaction tx, Block block, boolean pending) {
        String id = tx.getHash() != null && !tx.getHash().isBlank()
                ? shorten(tx.getHash(), 8, 6)
                : shorten(tx.getId(), 8, 6);

        if (pending) {
            return id + " · en attente";
        }

        return id + " · bloc #" + (block != null ? block.getIndex() : "?");
    }

    private boolean matchesBlockIndex(Block block, String query) {
        try {
            int index = Integer.parseInt(query);
            return block.getIndex() == index;
        } catch (NumberFormatException ex) {
            return String.valueOf(block.getIndex()).contains(query);
        }
    }

    private boolean matchesTransaction(Transaction tx, String normalized) {
        return contains(tx.getId(), normalized)
                || contains(tx.getHash(), normalized)
                || contains(tx.getSender(), normalized)
                || contains(tx.getRecipient(), normalized)
                || contains(tx.getPayload(), normalized)
                || contains(tx.getSignature(), normalized);
    }

    private boolean contains(String value, String normalizedQuery) {
        return value != null && value.toLowerCase(Locale.ROOT).contains(normalizedQuery);
    }

    private boolean looksLikeAddress(String query) {
        return query.length() >= 6 && query.matches("[A-Za-z0-9._-]+");
    }

    private String shorten(String value, int head, int tail) {
        if (value == null || value.isBlank()) {
            return "N/A";
        }
        if (value.length() <= head + tail + 3) {
            return value;
        }
        return value.substring(0, head) + "…" + value.substring(value.length() - tail);
    }
}
