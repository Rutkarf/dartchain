package io.dartchain.backend.auth.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.dartchain.backend.config.RateLimitProperties;
import io.dartchain.backend.ops.ApplicationMetricsCollector;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private static final Pattern PENDING_MINE_PATH = Pattern.compile("^/api/pending-transactions/[^/]+/mine$");

    private final RateLimitProperties rateLimitProperties;
    private final RateLimitCounterStore rateLimitCounterStore;
    private final ApplicationMetricsCollector metricsCollector;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public RateLimitFilter(RateLimitProperties rateLimitProperties, RateLimitCounterStore rateLimitCounterStore) {
        this(rateLimitProperties, rateLimitCounterStore, null);
    }

    @Autowired
    public RateLimitFilter(
            RateLimitProperties rateLimitProperties,
            RateLimitCounterStore rateLimitCounterStore,
            ApplicationMetricsCollector metricsCollector
    ) {
        this.rateLimitProperties = rateLimitProperties;
        this.rateLimitCounterStore = rateLimitCounterStore;
        this.metricsCollector = metricsCollector;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        String path = request.getRequestURI();
        if (!isLimitedPath(path)) {
            filterChain.doFilter(request, response);
            return;
        }

        String clientKey = resolveClientKey(request);
        int count = rateLimitCounterStore.incrementAndGet(clientKey, rateLimitProperties.getWindowMs());

        if (count > rateLimitProperties.getMaxRequests()) {
            if (metricsCollector != null) {
                metricsCollector.recordRateLimitHit(clientKey);
            }
            writeTooManyRequests(response);
            return;
        }

        filterChain.doFilter(request, response);
    }

    boolean isLimitedPath(String path) {
        List<String> limitedPaths = rateLimitProperties.getPaths();
        if (limitedPaths.contains(path)) {
            return true;
        }
        return PENDING_MINE_PATH.matcher(path).matches();
    }

    private String resolveClientKey(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim() + "|" + request.getRequestURI();
        }
        return request.getRemoteAddr() + "|" + request.getRequestURI();
    }

    private void writeTooManyRequests(HttpServletResponse response) throws IOException {
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", HttpStatus.TOO_MANY_REQUESTS.value());
        body.put("error", "Too Many Requests");
        body.put("message", "Trop de requêtes. Réessayez dans une minute.");
        body.put("timestamp", Instant.now().toString());

        objectMapper.writeValue(response.getOutputStream(), body);
    }
}
