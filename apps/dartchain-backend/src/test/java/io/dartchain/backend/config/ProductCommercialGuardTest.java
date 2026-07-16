package io.dartchain.backend.config;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ProductCommercialGuardTest {

    @Test
    void skipsValidationWhenNotCommercial() {
        ProductProperties properties = commercialProperties(false, true, true, true);
        MockEnvironment environment = new MockEnvironment();
        environment.setProperty("dartchain.persistence.mode", "memory");

        assertThatCode(() -> new ProductCommercialGuard(environment, properties).validate())
                .doesNotThrowAnyException();
    }

    @Test
    void rejectsMemoryPersistenceWhenCommercial() {
        ProductProperties properties = commercialProperties(true, false, false, false);
        MockEnvironment environment = hardenedEnvironment("memory");

        assertThatThrownBy(() -> new ProductCommercialGuard(environment, properties).validate())
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("postgres");
    }

    @Test
    void rejectsLegacyPrivateKeyWhenCommercial() {
        ProductProperties properties = commercialProperties(true, true, false, false);
        MockEnvironment environment = hardenedEnvironment("postgres");

        assertThatThrownBy(() -> new ProductCommercialGuard(environment, properties).validate())
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("allow-legacy-private-key");
    }

    @Test
    void rejectsServerWalletCreateWhenCommercial() {
        ProductProperties properties = commercialProperties(true, false, true, false);
        MockEnvironment environment = hardenedEnvironment("postgres");

        assertThatThrownBy(() -> new ProductCommercialGuard(environment, properties).validate())
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("allow-server-wallet-create");
    }

    @Test
    void rejectsFaucetWhenCommercial() {
        ProductProperties properties = commercialProperties(true, false, false, true);
        MockEnvironment environment = hardenedEnvironment("postgres");

        assertThatThrownBy(() -> new ProductCommercialGuard(environment, properties).validate())
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("faucet-enabled");
    }

    @Test
    void allowsValidCommercialConfiguration() {
        ProductProperties properties = commercialProperties(true, false, false, false);
        MockEnvironment environment = hardenedEnvironment("postgres");

        assertThatCode(() -> new ProductCommercialGuard(environment, properties).validate())
                .doesNotThrowAnyException();
    }

    @Test
    void rejectsWeakJwtSecretOnProdProfile() {
        ProductProperties properties = commercialProperties(false, false, false, true);
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles("prod");
        environment.setProperty("dartchain.persistence.mode", "postgres");
        environment.setProperty("dartchain.auth.jwt-secret", "dev-only-change-in-prod");
        environment.setProperty("dartchain.ops.actuator-token", "integration-test-actuator-token-ah");
        environment.setProperty("DATABASE_PASSWORD", "integration-test-db-password-ah");

        assertThatThrownBy(() -> new ProductCommercialGuard(environment, properties).validate())
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("DARTCHAIN_JWT_SECRET");
    }

    private static MockEnvironment hardenedEnvironment(String persistenceMode) {
        MockEnvironment environment = new MockEnvironment();
        environment.setProperty("dartchain.persistence.mode", persistenceMode);
        environment.setProperty(
                "dartchain.auth.jwt-secret",
                "integration-test-jwt-secret-value-32chars-min"
        );
        environment.setProperty("dartchain.ops.actuator-token", "integration-test-actuator-token-ah");
        environment.setProperty("DATABASE_PASSWORD", "integration-test-db-password-ah");
        return environment;
    }

    private static ProductProperties commercialProperties(
            boolean commercial,
            boolean allowLegacyPrivateKey,
            boolean allowServerWalletCreate,
            boolean faucetEnabled
    ) {
        ProductProperties properties = new ProductProperties();
        properties.setCommercial(commercial);
        properties.setAllowLegacyPrivateKey(allowLegacyPrivateKey);
        properties.setAllowServerWalletCreate(allowServerWalletCreate);
        properties.setFaucetEnabled(faucetEnabled);
        return properties;
    }
}
