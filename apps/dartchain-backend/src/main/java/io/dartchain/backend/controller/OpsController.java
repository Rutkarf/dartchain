package io.dartchain.backend.controller;

import io.dartchain.backend.auth.security.RoleAuthorizationService;
import io.dartchain.backend.dto.OpsSnapshotResponse;
import io.dartchain.backend.ops.OpsMetricsService;
import io.dartchain.backend.web.RequestClientInfo;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ops")
public class OpsController {

    private final OpsMetricsService opsMetricsService;
    private final RoleAuthorizationService roleAuthorizationService;

    public OpsController(OpsMetricsService opsMetricsService, RoleAuthorizationService roleAuthorizationService) {
        this.opsMetricsService = opsMetricsService;
        this.roleAuthorizationService = roleAuthorizationService;
    }

    @GetMapping("/snapshot")
    public OpsSnapshotResponse snapshot(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            HttpServletRequest httpRequest
    ) {
        roleAuthorizationService.requireAdmin(authorization, RequestClientInfo.clientIp(httpRequest));
        return opsMetricsService.buildSnapshot();
    }
}
