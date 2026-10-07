package io.dartchain.backend.config;

import org.springframework.beans.factory.InitializingBean;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.util.Arrays;

/**
 * Phase T/AD — refuse le démarrage si prod/staging/commercial tournent sans Postgres.
 */
@Component
public class PostgresOnlyProfileGuard implements InitializingBean {

    private final Environment environment;

    public PostgresOnlyProfileGuard(Environment environment) {
        this.environment = environment;
    }

    @Override
    public void afterPropertiesSet() {
        validate();
    }

    void validate() {
        String mode = environment.getProperty("dartchain.persistence.mode", "memory");
        if (!requiresPostgres()) {
            return;
        }

        if (!"postgres".equalsIgnoreCase(mode)) {
            throw new IllegalStateException(
                    "Ce profil exige dartchain.persistence.mode=postgres (actuel: "
                            + mode
                            + "). Le mode memory reste disponible hors prod/staging/commercial.");
        }
    }

    private boolean requiresPostgres() {
        boolean prodOrStaging = Arrays.stream(environment.getActiveProfiles())
                .anyMatch(profile -> profile.equalsIgnoreCase("prod")
                        || profile.equalsIgnoreCase("staging"));

        boolean commercial = environment.getProperty("dartchain.product.commercial", Boolean.class, false);
        return prodOrStaging || commercial;
    }
}
