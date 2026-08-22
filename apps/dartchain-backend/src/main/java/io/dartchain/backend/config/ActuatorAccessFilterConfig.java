package io.dartchain.backend.config;

import io.dartchain.backend.auth.application.AuthTokenResolver;
import io.dartchain.backend.ops.ActuatorAccessFilter;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;

@Configuration
public class ActuatorAccessFilterConfig {

    @Bean
    public ActuatorAccessFilter actuatorAccessFilter(
            OpsProperties opsProperties,
            AuthTokenResolver authTokenResolver
    ) {
        return new ActuatorAccessFilter(opsProperties, authTokenResolver);
    }

    @Bean
    public FilterRegistrationBean<ActuatorAccessFilter> actuatorAccessFilterRegistration(
            ActuatorAccessFilter actuatorAccessFilter
    ) {
        FilterRegistrationBean<ActuatorAccessFilter> registration = new FilterRegistrationBean<>();
        registration.setFilter(actuatorAccessFilter);
        registration.addUrlPatterns("/*");
        registration.setOrder(Ordered.HIGHEST_PRECEDENCE + 20);
        return registration;
    }
}
