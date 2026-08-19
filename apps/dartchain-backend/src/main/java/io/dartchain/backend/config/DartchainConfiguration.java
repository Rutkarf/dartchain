package io.dartchain.backend.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties({
        CorsProperties.class,
        RateLimitProperties.class,
        SecurityProperties.class,
        DataImportProperties.class,
        OpsProperties.class,
        ProductProperties.class,
        AuthProperties.class,
        ChainProperties.class,
        OAuthProperties.class,
        WigleProperties.class
})
public class DartchainConfiguration {
}
