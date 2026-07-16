package io.dartchain.backend.ops;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.actuate.info.Info;
import org.springframework.boot.actuate.info.InfoContributor;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Signale l'API métriques natives (Phase X → AE, sans Prometheus/Grafana).
 */
@Component
public class OpsInfoContributor implements InfoContributor {

    @Value("${info.app.phase:AE}")
    private String phase;

    @Override
    public void contribute(Info.Builder builder) {
        builder.withDetail(
                "ops",
                Map.of(
                        "phase", phase,
                        "observabilityModel", "native-json",
                        "metrics-api", "/api/v1/ops/snapshot",
                        "metrics-api-legacy", "/api/ops/snapshot",
                        "correlation-header", RequestCorrelationFilter.REQUEST_ID_HEADER,
                        "external-observability", "none"
                )
        );
    }
}
