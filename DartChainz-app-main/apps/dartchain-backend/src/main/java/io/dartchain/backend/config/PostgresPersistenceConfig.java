package io.dartchain.backend.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.transaction.annotation.EnableTransactionManagement;

@Configuration
@ConditionalOnProperty(name = "dartchain.persistence.mode", havingValue = "postgres")
@EnableJpaRepositories(basePackages = "io.dartchain.backend.persistence.repository")
@EntityScan(basePackages = "io.dartchain.backend.persistence.entity")
@EnableTransactionManagement
public class PostgresPersistenceConfig {
}
