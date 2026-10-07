package io.dartchain.backend.support;

import org.testcontainers.DockerClientFactory;

/**
 * Conditions JUnit pour tests optionnels (Docker, Postgres Testcontainers).
 */
public final class TestEnvironment {

    private TestEnvironment() {
    }

    public static boolean dockerAvailable() {
        try {
            return DockerClientFactory.instance().isDockerAvailable();
        } catch (RuntimeException | LinkageError ignored) {
            return false;
        }
    }
}
