package io.dartchain.backend.config;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PostgresOnlyProfileGuardTest {

    @Test
    void rejectsMemoryWhenCommercialEnabled() {
        MockEnvironment environment = new MockEnvironment();
        environment.setProperty("dartchain.persistence.mode", "memory");
        environment.setProperty("dartchain.product.commercial", "true");

        assertThatThrownBy(() -> new PostgresOnlyProfileGuard(environment).validate())
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("postgres");
    }

    @Test
    void allowsMemoryWithoutProdOrStaging() {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles("default");
        environment.setProperty("dartchain.persistence.mode", "memory");

        assertThatCode(() -> new PostgresOnlyProfileGuard(environment).validate())
                .doesNotThrowAnyException();
    }

    @Test
    void rejectsMemoryWhenProdActive() {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles("prod");
        environment.setProperty("dartchain.persistence.mode", "memory");

        assertThatThrownBy(() -> new PostgresOnlyProfileGuard(environment).validate())
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("postgres");
    }

    @Test
    void rejectsMemoryWhenStagingActive() {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles("postgres", "staging");
        environment.setProperty("dartchain.persistence.mode", "memory");

        assertThatThrownBy(() -> new PostgresOnlyProfileGuard(environment).validate())
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("postgres");
    }

    @Test
    void allowsPostgresWhenProdActive() {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles("prod", "postgres");
        environment.setProperty("dartchain.persistence.mode", "postgres");

        assertThatCode(() -> new PostgresOnlyProfileGuard(environment).validate())
                .doesNotThrowAnyException();
    }
}
