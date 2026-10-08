package io.dartchain.backend.admin.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.dartchain.backend.auth.audit.AuthAuditEntry;
import io.dartchain.backend.auth.audit.AuthAuditStore;
import io.dartchain.backend.auth.model.UserAccount;
import io.dartchain.backend.auth.store.UserAccountStore;
import io.dartchain.backend.blockchain.application.BlockchainService;
import io.dartchain.backend.blockchain.model.Block;
import io.dartchain.backend.blockchain.model.Transaction;
import io.dartchain.backend.faucet.model.FaucetClaim;
import io.dartchain.backend.faucet.store.FaucetClaimStore;
import io.dartchain.backend.ops.OpsMetricsService;
import io.dartchain.backend.ops.dto.OpsSnapshotResponse;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Agrège le contenu exportable pour le panel admin (SOC evidence pack).
 * N’exporte jamais passwordHash / passwordSalt / private keys.
 */
@Service
public class AdminExportService {

    public static final Set<String> DOMAINS = Set.of(
            "users",
            "authAudit",
            "faucetClaims",
            "blocks",
            "pending",
            "ops",
            "socControls"
    );

    private final UserAccountStore userAccountStore;
    private final AuthAuditStore authAuditStore;
    private final FaucetClaimStore faucetClaimStore;
    private final BlockchainService blockchainService;
    private final OpsMetricsService opsMetricsService;
    private final SocControlCatalogService socControlCatalogService;
    private final ObjectMapper objectMapper;

    public AdminExportService(
            UserAccountStore userAccountStore,
            AuthAuditStore authAuditStore,
            FaucetClaimStore faucetClaimStore,
            BlockchainService blockchainService,
            OpsMetricsService opsMetricsService,
            SocControlCatalogService socControlCatalogService,
            ObjectMapper objectMapper
    ) {
        this.userAccountStore = userAccountStore;
        this.authAuditStore = authAuditStore;
        this.faucetClaimStore = faucetClaimStore;
        this.blockchainService = blockchainService;
        this.opsMetricsService = opsMetricsService;
        this.socControlCatalogService = socControlCatalogService;
        this.objectMapper = objectMapper;
    }

    public Map<String, Object> buildBundle(Set<String> domains) {
        Set<String> selected = domains == null || domains.isEmpty() ? DOMAINS : domains;
        Map<String, Object> bundle = new LinkedHashMap<>();
        bundle.put("exportedAt", Instant.now().toString());
        bundle.put("product", "DartChain");
        bundle.put("frameworks", List.of("SOC1", "SOC2-Type1", "SOC2-Type2"));
        bundle.put("domains", selected.stream().sorted().toList());

        if (selected.contains("users")) {
            bundle.put("users", exportUsers());
        }
        if (selected.contains("authAudit")) {
            bundle.put("authAudit", exportAudit());
        }
        if (selected.contains("faucetClaims")) {
            bundle.put("faucetClaims", exportFaucet());
        }
        if (selected.contains("blocks")) {
            bundle.put("blocks", exportBlocks());
        }
        if (selected.contains("pending")) {
            bundle.put("pending", exportPending());
        }
        if (selected.contains("ops")) {
            bundle.put("ops", exportOps());
        }
        if (selected.contains("socControls")) {
            bundle.put("socControls", socControlCatalogService.catalog());
        }
        return bundle;
    }

    public String toJson(Map<String, Object> bundle) {
        try {
            return objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(bundle);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("JSON export failed", exception);
        }
    }

    public String toTxt(Map<String, Object> bundle) {
        StringBuilder sb = new StringBuilder();
        sb.append("DartChain Admin Export\n");
        sb.append("exportedAt=").append(bundle.get("exportedAt")).append('\n');
        sb.append("frameworks=").append(bundle.get("frameworks")).append("\n\n");
        for (Map.Entry<String, Object> entry : bundle.entrySet()) {
            if (Set.of("exportedAt", "product", "frameworks", "domains").contains(entry.getKey())) {
                continue;
            }
            sb.append("=== ").append(entry.getKey().toUpperCase(Locale.ROOT)).append(" ===\n");
            Object value = entry.getValue();
            if (value instanceof List<?> list) {
                sb.append("count=").append(list.size()).append('\n');
                for (Object row : list) {
                    sb.append(row).append('\n');
                }
            } else {
                sb.append(value).append('\n');
            }
            sb.append('\n');
        }
        return sb.toString();
    }

    public String toCsv(Map<String, Object> bundle) {
        StringBuilder sb = new StringBuilder();
        sb.append("# DartChain Admin Export CSV (multi-section)\n");
        sb.append("# exportedAt,").append(csv(String.valueOf(bundle.get("exportedAt")))).append('\n');
        appendUsersCsv(sb, asList(bundle.get("users")));
        appendGenericMapListCsv(sb, "authAudit", asList(bundle.get("authAudit")));
        appendGenericMapListCsv(sb, "faucetClaims", asList(bundle.get("faucetClaims")));
        appendGenericMapListCsv(sb, "blocks", asList(bundle.get("blocks")));
        appendGenericMapListCsv(sb, "pending", asList(bundle.get("pending")));
        appendSocCsv(sb, asList(bundle.get("socControls")));
        return sb.toString();
    }

    private List<Map<String, Object>> exportUsers() {
        List<Map<String, Object>> rows = new ArrayList<>();
        for (UserAccount account : userAccountStore.findAll()) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", account.getId());
            row.put("username", account.getUsername());
            row.put("email", account.getEmail());
            row.put("role", account.getRole() == null ? "USER" : account.getRole().name());
            row.put("walletAddress", account.getWalletAddress());
            row.put("createdAt", Instant.ofEpochMilli(account.getCreatedAt()).toString());
            rows.add(row);
        }
        return rows;
    }

    private List<Map<String, Object>> exportAudit() {
        List<Map<String, Object>> rows = new ArrayList<>();
        for (AuthAuditEntry entry : authAuditStore.snapshot()) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("at", Instant.ofEpochMilli(entry.createdAtEpochMs()).toString());
            row.put("userId", entry.userId());
            row.put("action", entry.action());
            row.put("detail", entry.detail());
            row.put("ip", entry.ipAddress());
            rows.add(row);
        }
        return rows;
    }

    private List<Map<String, Object>> exportFaucet() {
        List<Map<String, Object>> rows = new ArrayList<>();
        for (FaucetClaim claim : faucetClaimStore.findAllOrderByClaimedAtDesc()) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", claim.getId());
            row.put("walletAddress", claim.getWalletAddress());
            row.put("amount", claim.getAmount() == null ? null : claim.getAmount().toPlainString());
            row.put("claimedAt", Instant.ofEpochMilli(claim.getClaimedAt()).toString());
            row.put("txHash", claim.getTxHash());
            row.put("clientId", claim.getClientId());
            rows.add(row);
        }
        return rows;
    }

    private List<Map<String, Object>> exportBlocks() {
        List<Map<String, Object>> rows = new ArrayList<>();
        for (Block block : blockchainService.getBlocks()) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("index", block.getIndex());
            row.put("hash", block.getHash());
            row.put("previousHash", block.getPreviousHash());
            row.put("timestamp", block.getTimestamp());
            row.put("nonce", block.getNonce());
            row.put("txCount", block.getTransactions() == null ? 0 : block.getTransactions().size());
            rows.add(row);
        }
        return rows;
    }

    private List<Map<String, Object>> exportPending() {
        List<Map<String, Object>> rows = new ArrayList<>();
        for (Transaction tx : blockchainService.getPendingTransactions()) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", tx.getId());
            row.put("hash", tx.getHash());
            row.put("sender", tx.getSender());
            row.put("recipient", tx.getRecipient());
            row.put("amount", tx.getAmount() == null ? null : tx.getAmount().toPlainString());
            row.put("status", tx.getStatus());
            row.put("payload", tx.getPayload());
            rows.add(row);
        }
        return rows;
    }

    private Map<String, Object> exportOps() {
        OpsSnapshotResponse snapshot = opsMetricsService.buildSnapshot();
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("phase", snapshot.getPhase());
        row.put("collectedAt", snapshot.getCollectedAt());
        row.put("gauges", snapshot.getGauges());
        row.put("counters", snapshot.getCounters());
        row.put("latency", snapshot.getLatency());
        row.put("alerts", snapshot.getAlerts());
        row.put("recentEvents", snapshot.getRecentEvents());
        row.put("metadata", snapshot.getMetadata());
        return row;
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> asList(Object value) {
        if (value instanceof List<?> list) {
            return (List<Map<String, Object>>) list;
        }
        return List.of();
    }

    private void appendUsersCsv(StringBuilder sb, List<Map<String, Object>> rows) {
        sb.append("\n## users\n");
        sb.append("id,username,email,role,walletAddress,createdAt\n");
        for (Map<String, Object> row : rows) {
            sb.append(csv(row.get("id"))).append(',')
                    .append(csv(row.get("username"))).append(',')
                    .append(csv(row.get("email"))).append(',')
                    .append(csv(row.get("role"))).append(',')
                    .append(csv(row.get("walletAddress"))).append(',')
                    .append(csv(row.get("createdAt"))).append('\n');
        }
    }

    private void appendGenericMapListCsv(StringBuilder sb, String section, List<Map<String, Object>> rows) {
        sb.append("\n## ").append(section).append('\n');
        if (rows.isEmpty()) {
            sb.append("(empty)\n");
            return;
        }
        List<String> headers = new ArrayList<>(rows.get(0).keySet());
        sb.append(String.join(",", headers)).append('\n');
        for (Map<String, Object> row : rows) {
            List<String> cells = new ArrayList<>();
            for (String header : headers) {
                cells.add(csv(row.get(header)));
            }
            sb.append(String.join(",", cells)).append('\n');
        }
    }

    private void appendSocCsv(StringBuilder sb, List<Map<String, Object>> rows) {
        sb.append("\n## socControls\n");
        sb.append("framework,type,criterion,control,status,evidence\n");
        for (Map<String, Object> row : rows) {
            sb.append(csv(row.get("framework"))).append(',')
                    .append(csv(row.get("type"))).append(',')
                    .append(csv(row.get("criterion"))).append(',')
                    .append(csv(row.get("control"))).append(',')
                    .append(csv(row.get("status"))).append(',')
                    .append(csv(row.get("evidence"))).append('\n');
        }
    }

    private static String csv(Object value) {
        if (value == null) {
            return "";
        }
        String raw = String.valueOf(value).replace("\"", "\"\"");
        if (raw.contains(",") || raw.contains("\"") || raw.contains("\n")) {
            return "\"" + raw + "\"";
        }
        return raw;
    }
}
