package io.dartchain.backend.exchange;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

/**
 * Snapshot JSON du ledger exchange (soldes démo testnet + wallets seedés).
 */
public class ExchangeLedgerSnapshot {

    private Map<String, Map<String, String>> adjustments = new HashMap<>();
    private Set<String> seededWallets = new HashSet<>();

    public ExchangeLedgerSnapshot() {
    }

    public Map<String, Map<String, String>> getAdjustments() {
        return adjustments;
    }

    public void setAdjustments(Map<String, Map<String, String>> adjustments) {
        this.adjustments = adjustments != null ? adjustments : new HashMap<>();
    }

    public Set<String> seededWallets() {
        return seededWallets;
    }

    public Set<String> getSeededWallets() {
        return seededWallets;
    }

    public void setSeededWallets(Set<String> seededWallets) {
        this.seededWallets = seededWallets != null ? seededWallets : new HashSet<>();
    }
}
