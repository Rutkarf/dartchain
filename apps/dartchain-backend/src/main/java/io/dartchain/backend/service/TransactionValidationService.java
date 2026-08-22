package io.dartchain.backend.service;

import io.dartchain.backend.auth.store.UserAccountStore;
import io.dartchain.backend.config.SecurityProperties;
import io.dartchain.backend.shared.exception.TransactionValidationException;
import io.dartchain.backend.model.PendingTransaction;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Objects;

@Service
public class TransactionValidationService {

    private static final int MAX_DATA_LENGTH = 500;
    private static final int MIN_ADDRESS_LENGTH = 4;
    private static final BigDecimal MIN_AMOUNT = new BigDecimal("0.00000001");

    private final SecurityProperties securityProperties;

    public TransactionValidationService(SecurityProperties securityProperties) {
        this.securityProperties = securityProperties;
    }

    public void validateNewTransaction(
            String fromAddress,
            String toAddress,
            BigDecimal amount,
            String data,
            List<PendingTransaction> existingPendingTransactions
    ) {
        String normalizedFrom = normalize(fromAddress);
        String normalizedTo = normalize(toAddress);
        String normalizedData = normalize(data);

        validateAddresses(normalizedFrom, normalizedTo);
        validateAmount(amount);
        validateData(normalizedData);

        boolean duplicateTransaction = existingPendingTransactions != null
                && existingPendingTransactions.stream()
                .filter(Objects::nonNull)
                .anyMatch(existing ->
                        normalizedFrom.equals(normalize(existing.getFromAddress()))
                                && normalizedTo.equals(normalize(existing.getToAddress()))
                                && compareAmounts(amount, existing.getAmount())
                                && normalizedData.equals(normalize(existing.getData()))
                                && isPending(existing.getStatus())
                );

        if (duplicateTransaction) {
            throw new TransactionValidationException("An identical pending transaction already exists");
        }
    }

    public void validatePendingTransaction(PendingTransaction transaction) {
        validatePendingTransaction(transaction, null);
    }

    public void validatePendingTransaction(PendingTransaction transaction, UserAccountStore userAccountStore) {
        if (transaction == null) {
            throw new TransactionValidationException("Pending transaction must not be null");
        }

        validateId(transaction.getId());
        validateHash(transaction.getHash());
        validateAddresses(transaction.getFromAddress(), transaction.getToAddress());
        validateAmount(transaction.getAmount());
        validateData(transaction.getData());
        validateCreatedAt(transaction.getCreatedAt());
        validateStatus(transaction.getStatus());
        validateSignature(transaction.getSignature(), transaction, userAccountStore);
    }

    private void validateId(String id) {
        if (isBlank(id)) {
            throw new TransactionValidationException("Transaction id is required");
        }
    }

    private void validateHash(String hash) {
        if (isBlank(hash)) {
            throw new TransactionValidationException("Transaction hash is required");
        }

        if (hash.length() < 32) {
            throw new TransactionValidationException("Transaction hash format is invalid");
        }
    }

    private void validateAddresses(String fromAddress, String toAddress) {
        if (isBlank(fromAddress)) {
            throw new TransactionValidationException("fromAddress is required");
        }

        if (isBlank(toAddress)) {
            throw new TransactionValidationException("toAddress is required");
        }

        if (fromAddress.trim().length() < MIN_ADDRESS_LENGTH) {
            throw new TransactionValidationException("fromAddress is too short");
        }

        if (toAddress.trim().length() < MIN_ADDRESS_LENGTH) {
            throw new TransactionValidationException("toAddress is too short");
        }

        if (fromAddress.trim().equals(toAddress.trim())) {
            throw new TransactionValidationException("fromAddress and toAddress must be different");
        }
    }

    private void validateAmount(BigDecimal amount) {
        if (amount == null) {
            throw new TransactionValidationException("amount is required");
        }

        if (amount.compareTo(MIN_AMOUNT) < 0) {
            throw new TransactionValidationException("amount must be greater than 0");
        }

        if (amount.scale() > 8) {
            throw new TransactionValidationException("amount must not exceed 8 decimal places");
        }
    }

    private void validateData(String data) {
        String normalized = normalize(data);

        if (normalized.length() > MAX_DATA_LENGTH) {
            throw new TransactionValidationException(
                    "Transaction data must not exceed " + MAX_DATA_LENGTH + " characters"
            );
        }
    }

    private void validateCreatedAt(Long createdAt) {
        if (createdAt == null || createdAt <= 0) {
            throw new TransactionValidationException("createdAt is invalid");
        }
    }

    private void validateStatus(String status) {
        if (isBlank(status)) {
            throw new TransactionValidationException("status is required");
        }

        String normalized = status.trim().toUpperCase();

        boolean allowed = normalized.equals("PENDING")
                || normalized.equals("MINED")
                || normalized.equals("REJECTED");

        if (!allowed) {
            throw new TransactionValidationException("status is invalid");
        }
    }

    private void validateSignature(
            String signature,
            PendingTransaction transaction,
            UserAccountStore userAccountStore
    ) {
        if (isBlank(signature)) {
            throw new TransactionValidationException("signature is required");
        }

        if ("SIGNED_BACKEND".equals(signature)) {
            throw new TransactionValidationException("legacy signature is not allowed");
        }

        if (securityProperties.isStrictPendingSignatures()) {
            validateStrictAuthSignature(signature, transaction, userAccountStore);
            return;
        }

        validateLegacyPermissiveSignature(signature, transaction, userAccountStore);
    }

    private void validateStrictAuthSignature(
            String signature,
            PendingTransaction transaction,
            UserAccountStore userAccountStore
    ) {
        if (!signature.startsWith(PendingTransactionAttestation.AUTH_PREFIX)) {
            throw new TransactionValidationException("signature AUTHv1 requise");
        }

        if (userAccountStore == null || !PendingTransactionAttestation.verify(transaction, userAccountStore)) {
            throw new TransactionValidationException("signature verification failed");
        }
    }

    /**
     * @deprecated Phase N — mode permissif conservé lorsque {@code strict-pending-signatures=false}.
     */
    @Deprecated
    private void validateLegacyPermissiveSignature(
            String signature,
            PendingTransaction transaction,
            UserAccountStore userAccountStore
    ) {
        if (userAccountStore != null && signature.startsWith(PendingTransactionAttestation.AUTH_PREFIX)) {
            if (!PendingTransactionAttestation.verify(transaction, userAccountStore)) {
                throw new TransactionValidationException("signature verification failed");
            }
            return;
        }

        if (signature.trim().length() < 32) {
            throw new TransactionValidationException("signature format is invalid");
        }
    }

    private boolean compareAmounts(BigDecimal left, BigDecimal right) {
        if (left == null || right == null) {
            return false;
        }
        return left.compareTo(right) == 0;
    }

    private boolean isPending(String status) {
        return "PENDING".equalsIgnoreCase(normalize(status));
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim();
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
