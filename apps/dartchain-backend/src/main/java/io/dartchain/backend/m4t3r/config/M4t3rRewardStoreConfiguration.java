package io.dartchain.backend.m4t3r.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.dartchain.backend.m4t3r.JsonM4t3rRewardStore;
import io.dartchain.backend.m4t3r.store.M4t3rRewardStore;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Store M4T3R — JSON fichier, indépendant du mode persistence principal (memory/postgres).
 * Utilisé sur Render/prod : persistance dans {@code /app/data/m4t3r-rewards.json}.
 */
@Configuration
public class M4t3rRewardStoreConfiguration {

    @Bean
    @ConditionalOnMissingBean(M4t3rRewardStore.class)
    JsonM4t3rRewardStore m4t3rRewardStore(ObjectMapper objectMapper, M4t3rRewardConfig config) {
        return new JsonM4t3rRewardStore(objectMapper, config);
    }
}
