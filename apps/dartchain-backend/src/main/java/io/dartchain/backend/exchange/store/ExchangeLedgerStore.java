package io.dartchain.backend.exchange.store;

import java.math.BigDecimal;

public interface ExchangeLedgerStore {

    boolean markSeededIfAbsent(String walletAddress);

    void applyAdjustment(String walletAddress, String token, BigDecimal delta);

    BigDecimal getAdjustment(String walletAddress, String token);
}
