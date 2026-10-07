package io.dartchain.backend.blockchain.application;

import io.dartchain.backend.auth.model.UserAccount;
import io.dartchain.backend.auth.store.UserAccountStore;
import io.dartchain.backend.blockchain.model.PendingTransaction;
import io.dartchain.backend.shared.utils.HashUtils;
import io.dartchain.backend.shared.utils.WalletValidator;

import java.math.BigDecimal;
import java.util.Optional;

public final class PendingTransactionAttestation {

    public static final String AUTH_PREFIX = "AUTHv1:";
    private static final String LEGACY_SIGNATURE = "SIGNED_BACKEND";

    private PendingTransactionAttestation() {
    }

    public static String sign(UserAccount account, PendingTransaction transaction) {
        String payload = buildPayload(transaction);
        String walletAddress = WalletValidator.normalize(account.getWalletAddress());
        String digest = HashUtils.sha256(account.getId() + "|" + walletAddress + "|" + payload);
        return AUTH_PREFIX + account.getId() + ":" + digest;
    }

    public static boolean verify(PendingTransaction transaction, UserAccountStore userAccountStore) {
        String signature = transaction.getSignature();
        if (signature == null || signature.isBlank()) {
            return false;
        }

        if (LEGACY_SIGNATURE.equals(signature)) {
            return false;
        }

        if (!signature.startsWith(AUTH_PREFIX)) {
            return false;
        }

        String remainder = signature.substring(AUTH_PREFIX.length());
        int separator = remainder.indexOf(':');
        if (separator <= 0 || separator >= remainder.length() - 1) {
            return false;
        }

        String userId = remainder.substring(0, separator);
        String digest = remainder.substring(separator + 1);

        Optional<UserAccount> account = userAccountStore.findById(userId);
        if (account.isEmpty()) {
            return false;
        }

        String walletAddress = account.get().getWalletAddress();
        if (walletAddress == null || walletAddress.isBlank()) {
            return false;
        }

        if (!WalletValidator.normalize(walletAddress).equalsIgnoreCase(
                WalletValidator.normalize(transaction.getFromAddress())
        )) {
            return false;
        }

        String expected = HashUtils.sha256(
                account.get().getId() + "|" + WalletValidator.normalize(walletAddress) + "|" + buildPayload(transaction)
        );
        return expected.equals(digest);
    }

    private static String buildPayload(PendingTransaction transaction) {
        return safe(transaction.getFromAddress())
                + "|" + safe(transaction.getToAddress())
                + "|" + safeAmount(transaction.getAmount())
                + "|" + safe(transaction.getData())
                + "|" + safeLong(transaction.getCreatedAt());
    }

    private static String safe(String value) {
        return value == null ? "" : value.trim();
    }

    private static String safeAmount(BigDecimal value) {
        return value == null ? "0" : value.stripTrailingZeros().toPlainString();
    }

    private static String safeLong(Long value) {
        return value == null ? "0" : value.toString();
    }
}
