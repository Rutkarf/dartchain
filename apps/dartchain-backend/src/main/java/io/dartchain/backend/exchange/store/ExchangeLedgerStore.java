package io.dartchain.backend.exchange.store;

import java.math.BigDecimal;
import java.util.Map;

public interface ExchangeLedgerStore {

    boolean markSeededIfAbsent(String walletAddress);

    void applyAdjustment(String walletAddress, String token, BigDecimal delta);

    BigDecimal getAdjustment(String walletAddress, String token);

    /** Ajustements non nuls pour un wallet (token → delta). */
    Map<String, BigDecimal> listAdjustments(String walletAddress);
}
