package io.dartchain.backend.explorer.service;

import io.dartchain.backend.explorer.dto.ExplorerBlocksResponse;
import io.dartchain.backend.model.Block;
import io.dartchain.backend.model.Transaction;
import io.dartchain.backend.blockchain.application.BlockchainService;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.stream.Stream;

@Service
public class ExplorerBlocksService {

    private static final int DEFAULT_LIMIT = 100;
    private static final int MAX_LIMIT = 500;

    private final BlockchainService blockchainService;

    public ExplorerBlocksService(BlockchainService blockchainService) {
        this.blockchainService = blockchainService;
    }

    public ExplorerBlocksResponse filter(
            String wallet,
            Integer fromIndex,
            Integer toIndex,
            Integer limit
    ) {
        String normalizedWallet = normalizeWallet(wallet);
        int resolvedLimit = resolveLimit(limit);

        Stream<Block> stream = blockchainService.getBlocks().stream();

        if (fromIndex != null) {
            stream = stream.filter(block -> block.getIndex() >= fromIndex);
        }

        if (toIndex != null) {
            stream = stream.filter(block -> block.getIndex() <= toIndex);
        }

        if (StringUtils.hasText(normalizedWallet)) {
            stream = stream.filter(block -> blockInvolvesWallet(block, normalizedWallet));
        }

        List<Block> blocks = stream
                .sorted(Comparator.comparingInt(Block::getIndex).reversed())
                .limit(resolvedLimit)
                .toList();

        return new ExplorerBlocksResponse(
                StringUtils.hasText(normalizedWallet) ? wallet.trim() : null,
                fromIndex,
                toIndex,
                blocks.size(),
                blocks
        );
    }

    private boolean blockInvolvesWallet(Block block, String wallet) {
        if (block == null || block.getTransactions() == null) {
            return false;
        }

        for (Transaction transaction : block.getTransactions()) {
            if (transaction == null) {
                continue;
            }

            if (matchesWallet(transaction.getSender(), wallet)
                    || matchesWallet(transaction.getRecipient(), wallet)) {
                return true;
            }
        }

        return false;
    }

    private boolean matchesWallet(String value, String wallet) {
        return value != null && value.toLowerCase(Locale.ROOT).contains(wallet);
    }

    private String normalizeWallet(String wallet) {
        if (!StringUtils.hasText(wallet)) {
            return null;
        }

        return wallet.trim().toLowerCase(Locale.ROOT);
    }

    private int resolveLimit(Integer limit) {
        if (limit == null || limit <= 0) {
            return DEFAULT_LIMIT;
        }

        return Math.min(limit, MAX_LIMIT);
    }
}
