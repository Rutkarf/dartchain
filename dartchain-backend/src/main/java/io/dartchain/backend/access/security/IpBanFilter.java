package io.dartchain.backend.access.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.dartchain.backend.access.application.IpBanService;
import io.dartchain.backend.web.RequestClientInfo;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 20)
public class IpBanFilter extends OncePerRequestFilter {

    private final IpBanService ipBanService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public IpBanFilter(IpBanService ipBanService) {
        this.ipBanService = ipBanService;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        if (path == null) {
            return true;
        }
        if (path.startsWith("/actuator/health")) {
            return true;
        }
        // Laisse passer le ban et le status (idempotent / diagnostic).
        return path.equals("/api/access/age-decline") || path.equals("/api/access/status");
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        String ip = RequestClientInfo.clientIp(request);
        if (ipBanService.isBanned(ip)) {
            response.setStatus(HttpStatus.FORBIDDEN.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("status", HttpStatus.FORBIDDEN.value());
            body.put("error", "Forbidden");
            body.put("message", "Cette adresse IP est bannie de Dartchain.");
            body.put("reason", "age_decline");
            body.put("timestamp", Instant.now().toString());
            objectMapper.writeValue(response.getOutputStream(), body);
            return;
        }
        filterChain.doFilter(request, response);
    }
}
