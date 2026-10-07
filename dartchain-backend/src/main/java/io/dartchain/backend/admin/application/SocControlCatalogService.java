package io.dartchain.backend.admin.application;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Catalogue contrôles SOC 1 / SOC 2 Type 1 & Type 2 — evidence pack exportable.
 * Ce n’est pas une certification : statut = couverture technique dans le dépôt.
 */
@Service
public class SocControlCatalogService {

    public List<Map<String, Object>> catalog() {
        List<Map<String, Object>> rows = new ArrayList<>();
        rows.add(row("SOC1", "Type1", "ICFR-access", "Logical access to financial-relevant ledgers", "designed", "auth/ RoleAuthorizationService + JWT"));
        rows.add(row("SOC1", "Type1", "ICFR-change", "Change control over ledger code", "designed", "ci.yml + PR reviews"));
        rows.add(row("SOC1", "Type2", "ICFR-ops-period", "Operating effectiveness over observation period", "gap-org", "Requires auditor period + evidence pack"));
        rows.add(row("SOC2", "Type1", "CC6.1", "Logical access — JWT RBAC USER/ADMIN + admin seed unlock", "designed", "auth/ + AdminUnlockService"));
        rows.add(row("SOC2", "Type1", "CC6.6", "Transmission security — TLS / HSTS", "designed", "SecurityHeadersFilter + prod TLS"));
        rows.add(row("SOC2", "Type1", "CC6.7", "Secrets management — no plaintext seed in repo", "designed", "DARTCHAIN_ADMIN_SEED_SHA256 + .gitignore admin-seed.local.txt"));
        rows.add(row("SOC2", "Type1", "CC7.1", "Detection — health / ops snapshot / rate limit", "designed", "/api/health /api/v1/ops/snapshot RateLimitFilter"));
        rows.add(row("SOC2", "Type1", "CC7.2", "Monitoring — admin export evidence pack", "designed", "/api/v1/admin/export"));
        rows.add(row("SOC2", "Type1", "CC8.1", "Change management — CI gate", "designed", ".github/workflows/ci.yml"));
        rows.add(row("SOC2", "Type1", "A1.2", "Availability — healthchecks", "designed", "docker-compose / Render health"));
        rows.add(row("SOC2", "Type1", "PI1.1", "Processing integrity — tx validation", "partial", "TransactionValidationService"));
        rows.add(row("SOC2", "Type1", "C1.1", "Confidentiality — CORS / headers / no password export", "designed", "AdminExportService redacts hashes"));
        rows.add(row("SOC2", "Type2", "CC6.1-ops", "Access reviews over period", "gap-org", "Periodic access review (org process)"));
        rows.add(row("SOC2", "Type2", "CC7.2-ops", "Incident response operating evidence", "gap-org", "Tickets + smoke:live logs retention"));
        rows.add(row("SOC2", "Type2", "CC8.1-ops", "Change tickets over period", "gap-org", "PR history + release notes archive"));
        return rows;
    }

    private static Map<String, Object> row(
            String framework,
            String type,
            String criterion,
            String control,
            String status,
            String evidence
    ) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("framework", framework);
        map.put("type", type);
        map.put("criterion", criterion);
        map.put("control", control);
        map.put("status", status);
        map.put("evidence", evidence);
        return map;
    }
}
