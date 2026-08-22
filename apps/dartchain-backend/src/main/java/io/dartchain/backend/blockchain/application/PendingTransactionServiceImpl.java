package io.dartchain.backend.blockchain.application;

import io.dartchain.backend.auth.model.UserAccount;
import io.dartchain.backend.auth.store.UserAccountStore;
import io.dartchain.backend.blockchain.dto.AddPendingTransactionResponse;
import io.dartchain.backend.blockchain.dto.CreatePendingTransactionRequest;
import io.dartchain.backend.blockchain.dto.MinePendingTransactionResponse;
import io.dartchain.backend.blockchain.dto.PendingTransactionResponse;
import io.dartchain.backend.shared.exception.TransactionValidationException;
import io.dartchain.backend.blockchain.model.Block;
import io.dartchain.backend.blockchain.model.PendingTransaction;
import io.dartchain.backend.shared.utils.HashUtils;
import io.dartchain.backend.blockchain.application.BlockchainService;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
public class PendingTransactionServiceImpl implements PendingTransactionService {

    private final TransactionPoolService transactionPoolService;
    private final BlockchainService blockchainService;
    private final TransactionValidationService validationService;
    private final UserAccountStore userAccountStore;

    public PendingTransactionServiceImpl(
            TransactionPoolService transactionPoolService,
            BlockchainService blockchainService,
            TransactionValidationService validationService,
            UserAccountStore userAccountStore
    ) {
        this.transactionPoolService = transactionPoolService;
        this.blockchainService = blockchainService;
        this.validationService = validationService;
        this.userAccountStore = userAccountStore;
    }

    @Override
    public synchronized List<PendingTransactionResponse> getPendingTransactions() {
        return transactionPoolService.getPendingOnly().stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    public synchronized AddPendingTransactionResponse addPendingTransaction(
            CreatePendingTransactionRequest request,
            UserAccount account
    ) {
        String fromAddress = request.getFromAddress() != null ? request.getFromAddress().trim() : null;
        String toAddress = request.getToAddress() != null ? request.getToAddress().trim() : null;
        BigDecimal amount = request.getAmount() != null ? request.getAmount() : BigDecimal.ZERO;
        String data = request.getData() != null ? request.getData().trim() : "";

        validationService.validateNewTransaction(
                fromAddress,
                toAddress,
                amount,
                data,
                transactionPoolService.getAll()
        );

        PendingTransaction transaction = new PendingTransaction();
        transaction.setId(UUID.randomUUID().toString());
        transaction.setCreatedAt(System.currentTimeMillis());
        transaction.setFromAddress(fromAddress);
        transaction.setToAddress(toAddress);
        transaction.setAmount(amount);
        transaction.setData(data);
        transaction.setSignature(PendingTransactionAttestation.sign(account, transaction));
        transaction.setStatus("PENDING");
        transaction.setSystemReward(false);
        transaction.setHash(HashUtils.sha256(
                transaction.getId()
                        + "|" + safe(transaction.getFromAddress())
                        + "|" + safe(transaction.getToAddress())
                        + "|" + safeAmount(transaction.getAmount())
                        + "|" + safe(transaction.getData())
                        + "|" + transaction.getCreatedAt()
        ));

        validationService.validatePendingTransaction(transaction, userAccountStore);
        transactionPoolService.add(transaction);

        return new AddPendingTransactionResponse(
                "Transaction pending créée.",
                toResponse(transaction)
        );
    }

    @Override
    public synchronized MinePendingTransactionResponse minePendingTransaction(String id) {
        PendingTransaction transaction = transactionPoolService.findById(id);
        if (transaction == null) {
            throw new IllegalArgumentException("Pending transaction not found: " + id);
        }

        validationService.validatePendingTransaction(transaction, userAccountStore);

        String blockData = buildBlockData(transaction);
        Block block = blockchainService.addBlock(blockData);

        transaction.setStatus("MINED");
        transactionPoolService.removeById(id);

        return new MinePendingTransactionResponse(
                "Transaction minée avec succès.",
                block
        );
    }

    @Override
    public synchronized List<PendingTransaction> getAll() {
        return transactionPoolService.getAll();
    }

    @Override
    public synchronized boolean addFromPeer(PendingTransaction incoming) {
        if (incoming == null) {
            return false;
        }

        try {
            validationService.validatePendingTransaction(incoming, userAccountStore);
        } catch (TransactionValidationException exception) {
            return false;
        }

        return transactionPoolService.addIfAbsent(incoming);
    }

    @Override
    public synchronized PendingTransaction findById(String id) {
        return transactionPoolService.findById(id);
    }

    @Override
    public synchronized boolean removeById(String id) {
        return transactionPoolService.removeById(id);
    }

    private PendingTransactionResponse toResponse(PendingTransaction tx) {
        return new PendingTransactionResponse(
                tx.getId(),
                tx.getHash(),
                tx.getFromAddress(),
                tx.getToAddress(),
                tx.getAmount(),
                tx.getData(),
                tx.getSignature(),
                tx.getStatus(),
                tx.getCreatedAt(),
                tx.getSystemReward()
        );
    }

    private String buildBlockData(PendingTransaction transaction) {
        return "txId=" + safe(transaction.getId())
                + ";from=" + safe(transaction.getFromAddress())
                + ";to=" + safe(transaction.getToAddress())
                + ";amount=" + safeAmount(transaction.getAmount())
                + ";data=" + safe(transaction.getData())
                + ";signature=" + safe(transaction.getSignature())
                + ";status=" + safe(transaction.getStatus())
                + ";createdAt=" + safeLong(transaction.getCreatedAt());
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }

    private String safeAmount(BigDecimal value) {
        return value == null ? "0" : value.stripTrailingZeros().toPlainString();
    }

    private String safeLong(Long value) {
        return value == null ? "0" : value.toString();
    }
}
