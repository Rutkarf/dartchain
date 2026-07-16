package io.dartchain.backend.controller;

import io.dartchain.backend.config.ApiRoutes;
import io.dartchain.backend.config.ProductProperties;
import io.dartchain.backend.dto.HealthV1Response;
import io.dartchain.backend.ops.RequestCorrelationFilter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1")
public class HealthV1Controller {

    @Value("${dartchain.persistence.mode:memory}")
    private String persistenceMode;

    @Value("${info.app.version:0.0.0}")
    private String version;

    private final ProductProperties productProperties;

    public HealthV1Controller(ProductProperties productProperties) {
        this.productProperties = productProperties;
    }

    @GetMapping("/health")
    public HealthV1Response getHealth() {
        return new HealthV1Response(
                true,
                "dartchain-backend",
                version,
                persistenceMode,
                productProperties.isCommercial(),
                Map.of(
                        "faucet", productProperties.isFaucetEnabled(),
                        "showcase", productProperties.isShowcaseEnabled(),
                        "legacyPrivateKey", productProperties.isAllowLegacyPrivateKey(),
                        "serverWalletCreate", productProperties.isAllowServerWalletCreate(),
                        "legacyApiAliases", productProperties.isLegacyApiAliasesEnabled()
                ),
                Map.of(
                        "model", "native-json",
                        "metricsApi", ApiRoutes.OPS_SNAPSHOT_V1,
                        "correlationHeader", RequestCorrelationFilter.REQUEST_ID_HEADER
                )
        );
    }
}
