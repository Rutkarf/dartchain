package io.dartchain.backend.admin.infrastructure.web;

import io.dartchain.backend.admin.application.AdminExportService;
import io.dartchain.backend.admin.application.AdminUnlockService;
import io.dartchain.backend.admin.dto.AdminUnlockRequest;
import io.dartchain.backend.admin.dto.AdminUnlockResponse;
import io.dartchain.backend.config.ApiRoutes;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Arrays;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping(ApiRoutes.ADMIN_V1_PREFIX)
public class AdminV1Controller {

    private final AdminUnlockService unlockService;
    private final AdminExportService exportService;

    public AdminV1Controller(AdminUnlockService unlockService, AdminExportService exportService) {
        this.unlockService = unlockService;
        this.exportService = exportService;
    }

    @GetMapping("/status")
    public Map<String, Object> status() {
        return Map.of(
                "configured", unlockService.isConfigured(),
                "frameworks", new String[] {"SOC1", "SOC2-Type1", "SOC2-Type2"},
                "domains", AdminExportService.DOMAINS,
                "formats", new String[] {"json", "txt", "csv"}
        );
    }

    @PostMapping("/unlock")
    public AdminUnlockResponse unlock(@RequestBody AdminUnlockRequest request) {
        AdminUnlockService.UnlockResult result = unlockService.unlock(request == null ? null : request.seed());
        return new AdminUnlockResponse(
                true,
                result.unlockToken(),
                result.expiresAtEpochMs(),
                result.ttlSeconds(),
                "Panel admin déverrouillé"
        );
    }

    @PostMapping("/lock")
    public Map<String, Object> lock(
            @RequestHeader(value = AdminUnlockService.UNLOCK_HEADER, required = false) String unlockToken
    ) {
        unlockService.lock(unlockToken);
        return Map.of("success", true);
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> export(
            @RequestHeader(value = AdminUnlockService.UNLOCK_HEADER, required = false) String unlockToken,
            @RequestParam(defaultValue = "json") String format,
            @RequestParam(required = false) String domains
    ) {
        unlockService.requireUnlock(unlockToken);
        Set<String> selected = parseDomains(domains);
        Map<String, Object> bundle = exportService.buildBundle(selected);
        String fmt = format == null ? "json" : format.trim().toLowerCase(Locale.ROOT);
        String body;
        String contentType;
        String extension;
        switch (fmt) {
            case "csv" -> {
                body = exportService.toCsv(bundle);
                contentType = "text/csv";
                extension = "csv";
            }
            case "txt" -> {
                body = exportService.toTxt(bundle);
                contentType = "text/plain";
                extension = "txt";
            }
            default -> {
                body = exportService.toJson(bundle);
                contentType = "application/json";
                extension = "json";
            }
        }
        String filename = "dartchain-admin-export-" + Instant.now().toString().replace(':', '-') + "." + extension;
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType(contentType + ";charset=UTF-8"))
                .body(body.getBytes(StandardCharsets.UTF_8));
    }

    private static Set<String> parseDomains(String domains) {
        if (domains == null || domains.isBlank()) {
            return AdminExportService.DOMAINS;
        }
        return Arrays.stream(domains.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toSet());
    }
}
