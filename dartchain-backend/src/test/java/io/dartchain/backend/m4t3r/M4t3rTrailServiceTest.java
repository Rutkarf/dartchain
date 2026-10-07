package io.dartchain.backend.m4t3r;

import io.dartchain.backend.m4t3r.config.M4t3rRewardConfig;
import io.dartchain.backend.m4t3r.dto.M4t3rTrailPickupRequest;
import io.dartchain.backend.m4t3r.dto.WorldPoint;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class M4t3rTrailServiceTest {

    private M4t3rTrailService newService() {
        M4t3rRewardConfig config = new M4t3rRewardConfig();
        setField(config, "maxSpeedMps", "5.0");
        setField(config, "settlementMode", "OFFCHAIN");
        return new M4t3rTrailService(config);
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

    @Test
    void acceptsClustersAlongMovementAndIsIdempotent() {
        M4t3rTrailService service = newService();
        WorldPoint previous = new WorldPoint(1, 0, 1);
        WorldPoint current = new WorldPoint(1.4, 0, 1);
        Set<String> computed = M4t3rTrailService.clustersAlong(previous.x(), previous.z(), current.x(), current.z());
        assertThat(computed).isNotEmpty();

        M4t3rTrailPickupRequest request = new M4t3rTrailPickupRequest(
                "M4T3R_TRAIL_PICKUP_REQUEST",
                "player-1",
                previous,
                current,
                List.copyOf(computed),
                System.currentTimeMillis()
        );
        var first = service.pickup("player-1", request);
        assertThat(first.collectedCells()).isNotEmpty();
        assertThat(first.amount()).isEqualTo(first.collectedCells().size());
        assertThat(first.balanceAfter()).isEqualTo("0");
        assertThat(first.respawnAt()).isGreaterThan(System.currentTimeMillis());

        var second = service.pickup("player-1", request);
        assertThat(second.collectedCells()).isEmpty();
        assertThat(service.hiddenCells()).hasSize(first.collectedCells().size());
    }

    @Test
    void rejectsTeleportStep() {
        M4t3rTrailService service = newService();
        var response = service.pickup(
                "player-2",
                new M4t3rTrailPickupRequest(
                        "M4T3R_TRAIL_PICKUP_REQUEST",
                        "player-2",
                        new WorldPoint(0, 0, 0),
                        new WorldPoint(40, 0, 0),
                        List.of("m4t3r-cluster:0:0"),
                        System.currentTimeMillis()
                )
        );
        assertThat(response.collectedCells()).isEmpty();
        assertThat(response.amount()).isZero();
    }

    @Test
    void ignoresCandidateCellsOutsideRecomputedTrail() {
        M4t3rTrailService service = newService();
        var response = service.pickup(
                "player-3",
                new M4t3rTrailPickupRequest(
                        "M4T3R_TRAIL_PICKUP_REQUEST",
                        "player-3",
                        new WorldPoint(2, 0, 2),
                        new WorldPoint(2.3, 0, 2),
                        List.of("m4t3r-cluster:999:999"),
                        System.currentTimeMillis()
                )
        );
        assertThat(response.collectedCells()).isEmpty();
    }
}
