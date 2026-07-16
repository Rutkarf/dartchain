package io.dartchain.backend.service;

import io.dartchain.backend.model.PendingTransaction;
import io.dartchain.backend.model.Transaction;
import io.dartchain.backend.support.BlockchainTestSupport;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TransactionPoolServiceTest {

    private TransactionPoolService transactionPoolService;

    @BeforeEach
    void setUp() {
        transactionPoolService = BlockchainTestSupport.newTransactionPool(
                BlockchainTestSupport.inMemoryStore()
        );
    }

    @Test
    void addAndRetrievePendingTransaction() {
        PendingTransaction pending = samplePending("tx-1", "hash-1");

        transactionPoolService.add(pending);

        assertThat(transactionPoolService.getAll()).hasSize(1);
        assertThat(transactionPoolService.getPendingOnly()).containsExactly(pending);
        assertThat(transactionPoolService.findById("tx-1")).isEqualTo(pending);
    }

    @Test
    void rejectsDuplicateTransactionByIdOrHash() {
        PendingTransaction first = samplePending("tx-1", "hash-1");
        PendingTransaction duplicateId = samplePending("tx-1", "hash-2");
        PendingTransaction duplicateHash = samplePending("tx-2", "hash-1");

        transactionPoolService.add(first);

        assertThatThrownBy(() -> transactionPoolService.add(duplicateId))
                .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> transactionPoolService.add(duplicateHash))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void addIfAbsentIgnoresDuplicates() {
        PendingTransaction first = samplePending("tx-1", "hash-1");
        PendingTransaction duplicate = samplePending("tx-1", "hash-1");

        assertThat(transactionPoolService.addIfAbsent(first)).isTrue();
        assertThat(transactionPoolService.addIfAbsent(duplicate)).isFalse();
        assertThat(transactionPoolService.getAll()).hasSize(1);
    }

    @Test
    void drainAllEmptiesPool() {
        transactionPoolService.add(samplePending("tx-1", "hash-1"));
        transactionPoolService.add(samplePending("tx-2", "hash-2"));

        assertThat(transactionPoolService.drainAll()).hasSize(2);
        assertThat(transactionPoolService.getAll()).isEmpty();
    }

    @Test
    void removeByIdRemovesSingleTransaction() {
        PendingTransaction pending = samplePending("tx-1", "hash-1");
        transactionPoolService.add(pending);

        assertThat(transactionPoolService.removeById("tx-1")).isTrue();
        assertThat(transactionPoolService.getAll()).isEmpty();
    }

    @Test
    void getPendingOutgoingAmountSumsSenderTransactions() {
        PendingTransaction outgoing = samplePending("tx-1", "hash-1");
        outgoing.setFromAddress("alice");
        outgoing.setAmount(new BigDecimal("3.5"));

        PendingTransaction incoming = samplePending("tx-2", "hash-2");
        incoming.setFromAddress("bob");
        incoming.setToAddress("alice");
        incoming.setAmount(new BigDecimal("1.0"));

        transactionPoolService.add(outgoing);
        transactionPoolService.add(incoming);

        assertThat(transactionPoolService.getPendingOutgoingAmount("alice"))
                .isEqualByComparingTo("3.5");
    }

    @Test
    void convertsBetweenTransactionModels() {
        Transaction transaction = new Transaction();
        transaction.setId("tx-1");
        transaction.setHash("hash-1");
        transaction.setSender("alice");
        transaction.setRecipient("bob");
        transaction.setAmount(new BigDecimal("2.0"));
        transaction.setTimestamp(1_700_000_000_000L);
        transaction.setSignature("sig-abc123456");
        transaction.setPayload("payload");
        transaction.setStatus("PENDING");
        transaction.setSystemReward(false);

        PendingTransaction pending = TransactionPoolService.fromTransaction(transaction);
        Transaction roundTrip = TransactionPoolService.toTransaction(pending);

        assertThat(pending.getFromAddress()).isEqualTo("alice");
        assertThat(pending.getToAddress()).isEqualTo("bob");
        assertThat(roundTrip.getSender()).isEqualTo("alice");
        assertThat(roundTrip.getRecipient()).isEqualTo("bob");
        assertThat(roundTrip.getPayload()).isEqualTo("payload");
    }

    private PendingTransaction samplePending(String id, String hash) {
        PendingTransaction pending = new PendingTransaction();
        pending.setId(id);
        pending.setHash(hash);
        pending.setFromAddress("alice");
        pending.setToAddress("bob");
        pending.setAmount(new BigDecimal("1.0"));
        pending.setData("data");
        pending.setSignature("SIGNED_BACKEND");
        pending.setStatus("PENDING");
        pending.setCreatedAt(System.currentTimeMillis());
        pending.setSystemReward(false);
        return pending;
    }
}
