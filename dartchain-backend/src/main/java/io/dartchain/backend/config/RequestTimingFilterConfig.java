package io.dartchain.backend.config;

import io.dartchain.backend.ops.ApplicationMetricsCollector;
import io.dartchain.backend.ops.RequestTimingFilter;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;

@Configuration
public class RequestTimingFilterConfig {

    @Bean
    public RequestTimingFilter requestTimingFilter(ApplicationMetricsCollector metricsCollector) {
        return new RequestTimingFilter(metricsCollector);
    }

    @Bean
    public FilterRegistrationBean<RequestTimingFilter> requestTimingFilterRegistration(
            RequestTimingFilter requestTimingFilter
    ) {
        FilterRegistrationBean<RequestTimingFilter> registration = new FilterRegistrationBean<>();
        registration.setFilter(requestTimingFilter);
        registration.addUrlPatterns("/*");
        registration.setOrder(Ordered.HIGHEST_PRECEDENCE + 20);
        return registration;
    }
}
