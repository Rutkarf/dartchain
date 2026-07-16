package io.dartchain.backend.explorer.service;

import io.dartchain.backend.explorer.dto.ExplorerBlocksResponse;
import io.dartchain.backend.model.Block;
import io.dartchain.backend.model.Transaction;
import io.dartchain.backend.service.BlockchainService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ExplorerBlocksServiceTest {

    @Mock
    private BlockchainService blockchainService;

    private ExplorerBlocksService explorerBlocksService;

    @BeforeEach
    void setUp() {
        explorerBlocksService = new ExplorerBlocksService(blockchainService);
    }

    @Test
    void filterByHeightRange() {
        when(blockchainService.getBlocks()).thenReturn(List.of(
                block(0, "genesis"),
                block(1, "alpha"),
                block(2, "beta")
        ));

        ExplorerBlocksResponse response = explorerBlocksService.filter(null, 1, 2, null);

        assertThat(response.total()).isEqualTo(2);
        assertThat(response.blocks()).extracting(Block::getIndex).containsExactly(2, 1);
    }

    @Test
    void filterByWallet() {
        Block withWallet = block(1, "data");
        withWallet.setTransactions(List.of(tx("alice-wallet", "bob")));

        when(blockchainService.getBlocks()).thenReturn(List.of(
                block(0, "genesis"),
                withWallet,
                block(2, "other")
        ));

        ExplorerBlocksResponse response = explorerBlocksService.filter("alice", null, null, null);

        assertThat(response.total()).isEqualTo(1);
        assertThat(response.blocks()).singleElement().extracting(Block::getIndex).isEqualTo(1);
    }

    @Test
    void respectsLimit() {
        when(blockchainService.getBlocks()).thenReturn(List.of(
                block(0, "a"),
                block(1, "b"),
                block(2, "c")
        ));

        ExplorerBlocksResponse response = explorerBlocksService.filter(null, null, null, 2);

        assertThat(response.total()).isEqualTo(2);
        assertThat(response.blocks()).hasSize(2);
    }

    private Block block(int index, String data) {
        Block block = new Block();
        block.setIndex(index);
        block.setData(data);
        block.setHash("hash-" + index);
        block.setPreviousHash(index == 0 ? "0" : "hash-" + (index - 1));
        return block;
    }

    private Transaction tx(String sender, String recipient) {
        Transaction transaction = new Transaction();
        transaction.setSender(sender);
        transaction.setRecipient(recipient);
        transaction.setAmount(BigDecimal.ONE);
        return transaction;
    }
}
