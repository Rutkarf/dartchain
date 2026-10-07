package io.dartchain.backend.ops.infrastructure.web;

import io.dartchain.backend.ops.dto.HealthResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {

    @Value("${dartchain.persistence.mode:memory}")
    private String persistenceMode;

    @GetMapping("/api/health")
    public HealthResponse getHealth() {
        return new HealthResponse(true, "dartchain-backend", persistenceMode);
    }
}
