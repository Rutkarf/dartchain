package io.dartchain.backend.m4t3r;

import io.dartchain.backend.m4t3r.config.M4t3rRewardConfig;
import io.dartchain.backend.m4t3r.dto.M4t3rTrailPickupRequest;
import io.dartchain.backend.m4t3r.dto.WorldPoint;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class M4t3rRewardValidationServiceTest {

    private M4t3rRewardValidationService validationService;
    private M4t3rNonceStore nonceStore;

    @BeforeEach
    void setUp() {
        M4t3rRewardConfig config = new M4t3rRewardConfig();
        setField(config, "maxSpeedMps", "5.0");
        nonceStore = new M4t3rNonceStore();
        validationService = new M4t3rRewardValidationService(config, nonceStore);
    }

    @Test
    void acceptsNormalMovement() {
        var movement = validationService.validateMovement("p1", request(1, 1, 1.3, 1));
        assertThat(movement.isValid()).isTrue();
        assertThat(movement.getMeasuredSpeed()).isGreaterThanOrEqualTo(BigDecimal.ZERO);
    }

    @Test
    void rejectsTeleport() {
        var movement = validationService.validateMovement("p2", request(0, 0, 40, 0));
        assertThat(movement.isValid()).isFalse();
        assertThat(movement.getRejectionReason()).isEqualTo("TELEPORT_DETECTED");
    }

    @Test
    void rejectsReusedNonce() {
        M4t3rTrailPickupRequest request = new M4t3rTrailPickupRequest(
                "M4T3R_TRAIL_PICKUP_REQUEST",
                "p3",
                new WorldPoint(1, 0, 1),
                new WorldPoint(1.3, 0, 1),
                null,
                System.currentTimeMillis(),
                "1.0",
                "nonce-fixed"
        );
        assertThat(validationService.validateNonce("p3", request)).isNull();
        assertThat(validationService.validateNonce("p3", request)).isEqualTo("INVALID_NONCE");
    }

    private static M4t3rTrailPickupRequest request(double px, double pz, double cx, double cz) {
        return new M4t3rTrailPickupRequest(
                "M4T3R_TRAIL_PICKUP_REQUEST",
                "player",
                new WorldPoint(px, 0, pz),
                new WorldPoint(cx, 0, cz),
                null,
                System.currentTimeMillis(),
                "1.0",
                "n-" + System.nanoTime()
        );
    }

    private static void setField(Object target, String fieldName, String value) {
        try {
            var field = target.getClass().getDeclaredField(fieldName);
            field.setAccessible(true);
            field.set(target, value);
        } catch (ReflectiveOperationException exception) {
            throw new IllegalStateException(exception);
        }
    }
}
