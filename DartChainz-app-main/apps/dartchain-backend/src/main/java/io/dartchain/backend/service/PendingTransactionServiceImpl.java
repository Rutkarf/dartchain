package io.dartchain.backend.service;

import io.dartchain.backend.dto.AddPendingTransactionResponse;
import io.dartchain.backend.dto.CreatePendingTransactionRequest;
import io.dartchain.backend.dto.MinePendingTransactionResponse;
import io.dartchain.backend.dto.PendingTransactionResponse;
import io.dartchain.backend.exception.TransactionValidationException;
import io.dartchain.backend.model.Block;
import io.dartchain.backend.model.PendingTransaction;
import io.dartchain.backend.utils.HashUtils;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class PendingTransactionServiceImpl implements PendingTransactionService {

    private final List<PendingTransaction> pendingTransactions = new ArrayList<>();
    private final BlockchainService blockchainService;
    private final TransactionValidationService validationService;

    public PendingTransactionServiceImpl(
            BlockchainService blockchainService,
            TransactionValidationService validationService
    ) {
        this.blockchainService = blockchainService;
        this.validationService = validationService;
    }

    @Override
    public synchronized List<PendingTransactionResponse> getPendingTransactions() {
        return pendingTransactions.stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    public synchronized AddPendingTransactionResponse addPendingTransaction(CreatePendingTransactionRequest request) {
        String fromAddress = request.getFromAddress() != null ? request.getFromAddress().trim() : null;
        String toAddress = request.getToAddress() != null ? request.getToAddress().trim() : null;
        BigDecimal amount = request.getAmount() != null ? request.getAmount() : BigDecimal.ZERO;
        String data = request.getData() != null ? request.getData().trim() : "";

        validationService.validateNewTransaction(
                fromAddress,
                toAddress,
                amount,
                data,
                pendingTransactions
        );

        PendingTransaction transaction = new PendingTransaction();
        transaction.setId(UUID.randomUUID().toString());
        transaction.setCreatedAt(System.currentTimeMillis());
        transaction.setFromAddress(fromAddress);
        transaction.setToAddress(toAddress);
        transaction.setAmount(amount);
        transaction.setData(data);
        transaction.setSignature("SIGNED_BACKEND");
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

        validationService.validatePendingTransaction(transaction);

        pendingTransactions.add(transaction);

        return new AddPendingTransactionResponse(
                "Transaction pending créée.",
                toResponse(transaction)
        );
    }

    @Override
    public synchronized MinePendingTransactionResponse minePendingTransaction(String id) {
        PendingTransaction transaction = pendingTransactions.stream()
                .filter(tx -> tx.getId().equals(id))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Pending transaction not found: " + id));

        validationService.validatePendingTransaction(transaction);

        String blockData = buildBlockData(transaction);
        Block block = blockchainService.addBlock(blockData);

        transaction.setStatus("MINED");
        pendingTransactions.remove(transaction);

        return new MinePendingTransactionResponse(
                "Transaction minée avec succès.",
                block
        );
    }

    @Override
    public synchronized List<PendingTransaction> getAll() {
        return List.copyOf(pendingTransactions);
    }

    @Override
    public synchronized boolean addFromPeer(PendingTransaction incoming) {
        if (incoming == null) {
            return false;
        }

        try {
            validationService.validatePendingTransaction(incoming);
        } catch (TransactionValidationException exception) {
            return false;
        }

        boolean alreadyExists = pendingTransactions.stream().anyMatch(tx ->
                tx.getId().equals(incoming.getId())
                        || (tx.getHash() != null && tx.getHash().equals(incoming.getHash()))
        );

        if (alreadyExists) {
            return false;
        }

        pendingTransactions.add(incoming);
        return true;
    }

    @Override
    public synchronized PendingTransaction findById(String id) {
        if (id == null || id.isBlank()) {
            return null;
        }

        return pendingTransactions.stream()
                .filter(tx -> id.equals(tx.getId()))
                .findFirst()
                .orElse(null);
    }

    @Override
    public synchronized boolean removeById(String id) {
        if (id == null || id.isBlank()) {
            return false;
        }

        return pendingTransactions.removeIf(tx -> id.equals(tx.getId()));
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