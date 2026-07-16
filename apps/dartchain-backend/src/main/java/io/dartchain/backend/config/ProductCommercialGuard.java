package io.dartchain.backend.config;

import org.springframework.beans.factory.InitializingBean;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.util.Arrays;

/**
 * Phase Z / AH — refuse un démarrage commercial mal configuré (prod commercialisable).
 */
@Component
public class ProductCommercialGuard implements InitializingBean {

    private final Environment environment;
    private final ProductProperties productProperties;

    public ProductCommercialGuard(Environment environment, ProductProperties productProperties) {
        this.environment = environment;
        this.productProperties = productProperties;
    }

    @Override
    public void afterPropertiesSet() {
        validate();
    }

    void validate() {
        boolean hardenedProfile = productProperties.isCommercial() || isProdOrStagingProfile();
        if (hardenedProfile) {
            ProductionSecretPolicy.validate(environment);
        }

        if (!productProperties.isCommercial()) {
            return;
        }

        String persistenceMode = environment.getProperty("dartchain.persistence.mode", "postgres");
        if (!"postgres".equalsIgnoreCase(persistenceMode)) {
            throw new IllegalStateException(
                    "Le mode commercial exige dartchain.persistence.mode=postgres (actuel: "
                            + persistenceMode
                            + ").");
        }

        if (productProperties.isAllowLegacyPrivateKey()) {
            throw new IllegalStateException(
                    "Le mode commercial exige dartchain.product.allow-legacy-private-key=false.");
        }

        if (productProperties.isAllowServerWalletCreate()) {
            throw new IllegalStateException(
                    "Le mode commercial exige dartchain.product.allow-server-wallet-create=false.");
        }

        if (productProperties.isFaucetEnabled()) {
            throw new IllegalStateException(
                    "Le mode commercial exige dartchain.product.faucet-enabled=false.");
        }
    }

    private boolean isProdOrStagingProfile() {
        return Arrays.stream(environment.getActiveProfiles())
                .anyMatch(profile -> "prod".equalsIgnoreCase(profile) || "staging".equalsIgnoreCase(profile));
    }
}
