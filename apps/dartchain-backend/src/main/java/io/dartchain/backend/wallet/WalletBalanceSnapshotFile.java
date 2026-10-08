package io.dartchain.backend.wallet;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class WalletBalanceSnapshotFile {

    private Map<String, Map<String, Row>> balances = new LinkedHashMap<>();
    private List<Map<String, String>> events = new ArrayList<>();

    public Map<String, Map<String, Row>> getBalances() {
        return balances;
    }

    public void setBalances(Map<String, Map<String, Row>> balances) {
        this.balances = balances != null ? balances : new LinkedHashMap<>();
    }

    public List<Map<String, String>> getEvents() {
        return events;
    }

    public void setEvents(List<Map<String, String>> events) {
        this.events = events != null ? events : new ArrayList<>();
    }

    public static class Row {
        private String balance;
        private String chainBalance;
        private String ledgerAdjustment;
        private String source;

        public String getBalance() {
            return balance;
        }

        public void setBalance(String balance) {
            this.balance = balance;
        }

        public String getChainBalance() {
            return chainBalance;
        }

        public void setChainBalance(String chainBalance) {
            this.chainBalance = chainBalance;
        }

        public String getLedgerAdjustment() {
            return ledgerAdjustment;
        }

        public void setLedgerAdjustment(String ledgerAdjustment) {
            this.ledgerAdjustment = ledgerAdjustment;
        }

        public String getSource() {
            return source;
        }

        public void setSource(String source) {
            this.source = source;
        }
    }
}
