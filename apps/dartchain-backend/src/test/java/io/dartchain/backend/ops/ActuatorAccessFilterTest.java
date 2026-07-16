package io.dartchain.backend.ops;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ActuatorAccessFilterTest {

    @Test
    void isPublicActuatorPath_allowsHealthAndInfo() {
        assertTrue(ActuatorAccessFilter.isPublicActuatorPath("/actuator/health"));
        assertTrue(ActuatorAccessFilter.isPublicActuatorPath("/actuator/health/liveness"));
        assertTrue(ActuatorAccessFilter.isPublicActuatorPath("/actuator/info"));
    }

    @Test
    void isPublicActuatorPath_blocksSensitiveEndpoints() {
        assertFalse(ActuatorAccessFilter.isPublicActuatorPath("/actuator/metrics"));
        assertFalse(ActuatorAccessFilter.isPublicActuatorPath("/actuator/prometheus"));
        assertFalse(ActuatorAccessFilter.isPublicActuatorPath("/actuator/env"));
    }

    @Test
    void requiresProtectedAccess_includesOpsApi() {
        assertTrue(ActuatorAccessFilter.requiresProtectedAccess("/api/ops/snapshot"));
        assertTrue(ActuatorAccessFilter.requiresProtectedAccess("/api/v1/ops/snapshot"));
        assertFalse(ActuatorAccessFilter.requiresProtectedAccess("/api/health"));
    }
}
