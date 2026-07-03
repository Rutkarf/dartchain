package io.dartchain.backend.service;

import io.dartchain.backend.dto.BlockValidationResult;
import io.dartchain.backend.dto.PendingTransactionResponse;
import io.dartchain.backend.model.Transaction;
import io.dartchain.backend.showcase.service.MarketChartService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MempoolUnificationTest {

    @Mock
    private BlockchainValidationService validationService;

    @Mock
    private MarketChartService marketChartService;

    private TransactionPoolService transactionPoolService;
    private BlockchainService blockchainService;
    private PendingTransactionServiceImpl pendingTransactionService;

    @BeforeEach
    void setUp() {
        transactionPoolService = new TransactionPoolService();
        blockchainService = new BlockchainService(
                validationService,
                marketChartService,
                transactionPoolService
        );
        pendingTransactionService = new PendingTransactionServiceImpl(
                transactionPoolService,
                blockchainService,
                new TransactionValidationService()
        );
    }

    @Test
    void blockchainAndPendingEndpointsReadSamePool() {
        var pending = new io.dartchain.backend.model.PendingTransaction();
        pending.setId("shared-tx");
        pending.setHash("0123456789012345678901234567890123456789012345678901234567890");
        pending.setFromAddress("alice");
        pending.setToAddress("bob");
        pending.setAmount(new BigDecimal("1.5"));
        pending.setData("payload");
        pending.setSignature("SIGNED_BACKEND");
        pending.setStatus("PENDING");
        pending.setCreatedAt(System.currentTimeMillis());
        pending.setSystemReward(false);

        transactionPoolService.add(pending);

        assertThat(blockchainService.getPendingTransactions())
                .extracting(Transaction::getId)
                .containsExactly("shared-tx");

        assertThat(pendingTransactionService.getPendingTransactions())
                .extracting(PendingTransactionResponse::getId)
                .containsExactly("shared-tx");
    }

    @Test
    void miningThroughBlockchainDrainsSharedPool() {
        when(validationService.validateBlockAgainstChain(any(), anyList()))
                .thenReturn(new BlockValidationResult(true, "ok"));

        var pending = new io.dartchain.backend.model.PendingTransaction();
        pending.setId("mine-me");
        pending.setHash("0123456789012345678901234567890123456789012345678901234567890");
        pending.setFromAddress("alice");
        pending.setToAddress("bob");
        pending.setAmount(new BigDecimal("1.0"));
        pending.setData("payload");
        pending.setSignature("SIGNED_BACKEND");
        pending.setStatus("PENDING");
        pending.setCreatedAt(System.currentTimeMillis());
        pending.setSystemReward(false);

        transactionPoolService.add(pending);

        blockchainService.minePendingTransactions("miner-1");

        assertThat(blockchainService.getPendingTransactions()).isEmpty();
        assertThat(pendingTransactionService.getPendingTransactions()).isEmpty();
    }
}
