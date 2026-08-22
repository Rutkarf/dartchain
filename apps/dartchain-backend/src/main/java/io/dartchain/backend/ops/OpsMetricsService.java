package io.dartchain.backend.ops;

import io.dartchain.backend.chain.ChainConfigService;
import io.dartchain.backend.config.OpsProperties;
import io.dartchain.backend.config.ProductProperties;
import io.dartchain.backend.ops.dto.OpsAlertResponse;
import io.dartchain.backend.ops.dto.OpsSnapshotResponse;
import io.dartchain.backend.live.LiveUpdateSessionRegistry;
import io.dartchain.backend.p2p.P2pSessionRegistry;
import io.dartchain.backend.blockchain.application.BlockchainService;
import io.dartchain.backend.peers.application.PeerService;
import io.dartchain.backend.blockchain.application.TransactionPoolService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class OpsMetricsService {

    private final ApplicationMetricsCollector metricsCollector;
    private final BlockchainService blockchainService;
    private final TransactionPoolService transactionPoolService;
    private final P2pSessionRegistry p2pSessionRegistry;
    private final LiveUpdateSessionRegistry liveUpdateSessionRegistry;
    private final PeerService peerService;
    private final OpsProperties opsProperties;
    private final ProductProperties productProperties;
    private final ChainConfigService chainConfigService;
    private final String persistenceMode;
    private final String appVersion;

    public OpsMetricsService(
            ApplicationMetricsCollector metricsCollector,
            BlockchainService blockchainService,
            TransactionPoolService transactionPoolService,
            P2pSessionRegistry p2pSessionRegistry,
            LiveUpdateSessionRegistry liveUpdateSessionRegistry,
            PeerService peerService,
            OpsProperties opsProperties,
            ProductProperties productProperties,
            ChainConfigService chainConfigService,
            @Value("${dartchain.persistence.mode:memory}") String persistenceMode,
            @Value("${info.app.version:0.0.0}") String appVersion
    ) {
        this.metricsCollector = metricsCollector;
        this.blockchainService = blockchainService;
        this.transactionPoolService = transactionPoolService;
        this.p2pSessionRegistry = p2pSessionRegistry;
        this.liveUpdateSessionRegistry = liveUpdateSessionRegistry;
        this.peerService = peerService;
        this.opsProperties = opsProperties;
        this.productProperties = productProperties;
        this.chainConfigService = chainConfigService;
        this.persistenceMode = persistenceMode;
        this.appVersion = appVersion;
    }

    public OpsSnapshotResponse buildSnapshot() {
        Map<String, Long> gauges = new LinkedHashMap<>();
        gauges.put("chainHeight", (long) blockchainService.getBlocks().size());
        gauges.put("mempoolSize", (long) transactionPoolService.getAll().size());
        gauges.put("p2pSessions", (long) p2pSessionRegistry.count());
        gauges.put("liveWsSessions", (long) liveUpdateSessionRegistry.getAll().size());
        gauges.put("registeredPeers", (long) peerService.getPeers().size());
        gauges.put("chainId", chainConfigService.resolveChainId());

        Map<String, Long> latency = metricsCollector.latencySnapshot();
        Map<String, Object> metadata = buildMetadata();
        Map<String, Long> counters = metricsCollector.countersSnapshot();

        List<OpsAlertResponse> alerts = buildAlerts(gauges, counters, latency);

        List<OpsSnapshotResponse.OpsEventView> events = metricsCollector.recentEventsSnapshot().stream()
                .map(event -> new OpsSnapshotResponse.OpsEventView(
                        event.at(),
                        event.type(),
                        event.detail()
                ))
                .toList();

        return new OpsSnapshotResponse(
                Instant.now(),
                counters,
                gauges,
                latency,
                metadata,
                events,
                alerts,
                "AF"
        );
    }

    private Map<String, Object> buildMetadata() {
        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("observabilityModel", "native-json");
        metadata.put("externalStack", "none");
        metadata.put("metricsApiLegacy", "/api/ops/snapshot");
        metadata.put("metricsApiV1", "/api/v1/ops/snapshot");
        metadata.put("correlationHeader", RequestCorrelationFilter.REQUEST_ID_HEADER);
        metadata.put("loggingFormat", "json-en-prod-staging");
        metadata.put("persistenceMode", persistenceMode);
        metadata.put("commercial", productProperties.isCommercial());
        metadata.put("version", appVersion);
        return Map.copyOf(metadata);
    }

    private List<OpsAlertResponse> buildAlerts(
            Map<String, Long> gauges,
            Map<String, Long> counters,
            Map<String, Long> latency
    ) {
        List<OpsAlertResponse> alerts = new ArrayList<>();

        long mempoolSize = gauges.getOrDefault("mempoolSize", 0L);
        if (mempoolSize >= opsProperties.getMempoolAlertThreshold()) {
            alerts.add(new OpsAlertResponse(
                    "warn",
                    "MEMPOOL_HIGH",
                    "Mempool size " + mempoolSize + " >= threshold " + opsProperties.getMempoolAlertThreshold()
            ));
        }

        long registeredPeers = gauges.getOrDefault("registeredPeers", 0L);
        long p2pSessions = gauges.getOrDefault("p2pSessions", 0L);
        if (registeredPeers > 0 && p2pSessions == 0) {
            alerts.add(new OpsAlertResponse(
                    "warn",
                    "P2P_DISCONNECTED",
                    "Peers enregistrés mais aucune session WebSocket P2P active"
            ));
        }

        if (!blockchainService.isChainValid()) {
            alerts.add(new OpsAlertResponse(
                    "error",
                    "CHAIN_INVALID",
                    "La chaîne locale n'est plus valide"
            ));
        }

        long httpErrors = counters.getOrDefault("httpErrors", 0L);
        if (httpErrors >= opsProperties.getHttpErrorAlertThreshold()) {
            alerts.add(new OpsAlertResponse(
                    "warn",
                    "HTTP_ERRORS_HIGH",
                    "Erreurs HTTP cumulées " + httpErrors + " >= seuil " + opsProperties.getHttpErrorAlertThreshold()
            ));
        }

        long rbacDenied = counters.getOrDefault("rbacDenied", 0L);
        if (rbacDenied >= opsProperties.getRbacDeniedAlertThreshold()) {
            alerts.add(new OpsAlertResponse(
                    "warn",
                    "RBAC_DENIED_HIGH",
                    "Refus RBAC cumulés " + rbacDenied + " >= seuil " + opsProperties.getRbacDeniedAlertThreshold()
            ));
        }

        long maxLatency = latency.getOrDefault("maxRequestLatencyMs", 0L);
        if (maxLatency >= opsProperties.getSlowRequestThresholdMs()) {
            alerts.add(new OpsAlertResponse(
                    "warn",
                    "SLOW_REQUEST",
                    "Latence max observée " + maxLatency + "ms >= seuil "
                            + opsProperties.getSlowRequestThresholdMs() + "ms"
            ));
        }

        if (productProperties.isCommercial() && "memory".equalsIgnoreCase(persistenceMode)) {
            alerts.add(new OpsAlertResponse(
                    "error",
                    "COMMERCIAL_MEMORY_PERSISTENCE",
                    "Mode commercial actif avec persistance memory — Postgres requis"
            ));
        }

        return List.copyOf(alerts);
    }
}
