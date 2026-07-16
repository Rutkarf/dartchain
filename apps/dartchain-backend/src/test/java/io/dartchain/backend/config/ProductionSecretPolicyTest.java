package io.dartchain.backend.config;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ProductionSecretPolicyTest {

    @Test
    void acceptsStrongSecrets() {
        MockEnvironment environment = strongEnvironment();

        assertThatCode(() -> ProductionSecretPolicy.validate(environment))
                .doesNotThrowAnyException();
    }

    @Test
    void rejectsWeakDatabasePassword() {
        MockEnvironment environment = strongEnvironment();
        environment.setProperty("DATABASE_PASSWORD", "dartchain");

        assertThatThrownBy(() -> ProductionSecretPolicy.validate(environment))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("DATABASE_PASSWORD");
    }

    @Test
    void rejectsShortJwtSecret() {
        MockEnvironment environment = strongEnvironment();
        environment.setProperty("dartchain.auth.jwt-secret", "too-short");

        assertThatThrownBy(() -> ProductionSecretPolicy.validate(environment))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("DARTCHAIN_JWT_SECRET");
    }

    @Test
    void rejectsDockerDefaultActuatorToken() {
        MockEnvironment environment = strongEnvironment();
        environment.setProperty("dartchain.ops.actuator-token", "local-docker-actuator-token");

        assertThatThrownBy(() -> ProductionSecretPolicy.validate(environment))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("DARTCHAIN_ACTUATOR_TOKEN");
    }

    private static MockEnvironment strongEnvironment() {
        MockEnvironment environment = new MockEnvironment();
        environment.setProperty(
                "dartchain.auth.jwt-secret",
                "integration-test-jwt-secret-value-32chars-min"
        );
        environment.setProperty("dartchain.ops.actuator-token", "integration-test-actuator-token-ah");
        environment.setProperty("DATABASE_PASSWORD", "integration-test-db-password-ah");
        return environment;
    }
}
