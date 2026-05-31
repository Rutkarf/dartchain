package io.dartchain.backend.controller;

import io.dartchain.backend.dto.HealthResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {

    @GetMapping("/api/health")
    public HealthResponse getHealth() {
        return new HealthResponse(true, "dartchain-backend");
    }
}