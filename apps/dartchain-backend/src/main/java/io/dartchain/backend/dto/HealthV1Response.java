package io.dartchain.backend.dto;

import java.util.Map;

/**
 * Contrat health versionné pour intégrations commerciales.
 */
public record HealthV1Response(
        boolean ok,
        String service,
        String version,
        String persistenceMode,
        boolean commercial,
        Map<String, Boolean> features,
        Map<String, String> observability
) {
}
