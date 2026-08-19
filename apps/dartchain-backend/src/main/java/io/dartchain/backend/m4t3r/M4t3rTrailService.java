package io.dartchain.backend.m4t3r;

import io.dartchain.backend.m4t3r.config.M4t3rRewardConfig;
import io.dartchain.backend.m4t3r.dto.M4t3rHiddenCell;
import io.dartchain.backend.m4t3r.dto.M4t3rTrailPickupRequest;
import io.dartchain.backend.m4t3r.dto.M4t3rTrailPickupResponse;
import io.dartchain.backend.m4t3r.dto.WorldPoint;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Validateur autoritaire de collecte M4T3R par traînée.
 * N'attribue aucun solde wallet / blockchain.
 */
@Service
public class M4t3rTrailService {

    static final double CLUSTER_SIZE = 0.14;
    static final double TRAIL_WIDTH = 0.8;
    static final double SAMPLE_DISTANCE = 0.05;
    static final double MAX_STEP_METERS = 3.6;
    static final double MAX_SPEED_METERS_PER_SECOND = 32;
    static final double WATER_MIN_Z = 14;
    static final int MAX_CELLS_PER_UPDATE = 250;
    static final int MAX_CELLS_PER_SECOND = 250;
    static final long RESPAWN_DELAY_MS = 30_000L;

    private final Map<String, Long> hiddenUntil = new ConcurrentHashMap<>();
    private final Map<String, RateWindow> rates = new ConcurrentHashMap<>();
    private final Map<String, LastMove> lastMoves = new ConcurrentHashMap<>();
    private final M4t3rRewardConfig rewardConfig;

    public M4t3rTrailService(M4t3rRewardConfig rewardConfig) {
        this.rewardConfig = rewardConfig;
    }

    public M4t3rTrailPickupResponse pickup(String playerId, M4t3rTrailPickupRequest request) {
        expireHidden();
        long now = System.currentTimeMillis();
        WorldPoint previous = request.previousPosition();
        WorldPoint current = request.currentPosition();
        if (previous == null || current == null) {
            return M4t3rTrailPickupResponse.empty(playerId);
        }
        double step = Math.hypot(current.x() - previous.x(), current.z() - previous.z());
        if (step < 0.02 || step > MAX_STEP_METERS) {
            return M4t3rTrailPickupResponse.empty(playerId);
        }
        BigDecimal measuredSpeed = BigDecimal.ZERO;
        LastMove last = lastMoves.get(playerId);
        if (last != null) {
            double dt = (now - last.atMs) / 1000.0;
            double fromLast = Math.hypot(current.x() - last.x, current.z() - last.z);
            if (dt > 0.02 && fromLast / dt > MAX_SPEED_METERS_PER_SECOND) {
                return M4t3rTrailPickupResponse.empty(playerId);
            }
            if (dt > 0.02) {
                measuredSpeed = BigDecimal.valueOf(fromLast / dt).setScale(3, RoundingMode.HALF_UP);
            }
        }
        lastMoves.put(playerId, new LastMove(current.x(), current.z(), now));

        Set<String> computed = clustersAlong(previous.x(), previous.z(), current.x(), current.z());
        List<String> candidates = request.candidateCellIds() == null ? List.of() : request.candidateCellIds();
        List<String> accepted = new ArrayList<>();
        RateWindow window = rates.computeIfAbsent(playerId, ignored -> new RateWindow(now, 0));
        if (now - window.startedAt >= 1000) {
            window.startedAt = now;
            window.count = 0;
        }
        for (String cellId : candidates) {
            if (accepted.size() >= MAX_CELLS_PER_UPDATE) {
                break;
            }
            if (window.count >= MAX_CELLS_PER_SECOND) {
                break;
            }
            if (!computed.contains(cellId) || !isValidClusterId(cellId)) {
                continue;
            }
            int[] grid = M4t3rGridUtils.parseClusterGrid(cellId);
            if (grid == null || !M4t3rGridUtils.isClusterOnCheckerboard(grid[0], grid[1], CLUSTER_SIZE)) {
                continue;
            }
            Long until = hiddenUntil.get(cellId);
            if (until != null && until > now) {
                continue;
            }
            long respawnAt = now + RESPAWN_DELAY_MS;
            hiddenUntil.put(cellId, respawnAt);
            accepted.add(cellId);
            window.count += 1;
        }
        long respawnAt = accepted.isEmpty() ? now : now + RESPAWN_DELAY_MS;
        return new M4t3rTrailPickupResponse(
                "M4T3R_TRAIL_PICKUP_ACCEPTED",
                playerId,
                accepted,
                accepted.size(),
                respawnAt,
                "0",
                measuredSpeed.toPlainString(),
                rewardConfig.getMaxSpeedMps().toPlainString(),
                rewardConfig.getSettlementMode(),
                List.of()
        );
    }

    public List<M4t3rHiddenCell> hiddenCells() {
        expireHidden();
        long now = System.currentTimeMillis();
        List<M4t3rHiddenCell> cells = new ArrayList<>();
        for (Map.Entry<String, Long> entry : hiddenUntil.entrySet()) {
            if (entry.getValue() > now) {
                cells.add(new M4t3rHiddenCell(entry.getKey(), entry.getValue()));
            }
        }
        return cells;
    }

    static Set<String> clustersAlong(double px, double pz, double cx, double cz) {
        double dx = cx - px;
        double dz = cz - pz;
        double dist = Math.hypot(dx, dz);
        LinkedHashSet<String> ids = new LinkedHashSet<>();
        if (dist < 1e-5) {
            ids.add(clusterId((int) Math.floor(cx / CLUSTER_SIZE), (int) Math.floor(cz / CLUSTER_SIZE)));
            return ids;
        }
        int samples = Math.max(1, (int) Math.ceil(dist / SAMPLE_DISTANCE));
        double nx = -dz / dist;
        double nz = dx / dist;
        double half = TRAIL_WIDTH * 0.5;
        int across = Math.max(1, (int) Math.ceil(TRAIL_WIDTH / CLUSTER_SIZE));
        for (int s = 0; s <= samples && ids.size() < MAX_CELLS_PER_UPDATE; s++) {
            double t = (double) s / samples;
            double x = px + dx * t;
            double z = pz + dz * t;
            for (int a = 0; a <= across && ids.size() < MAX_CELLS_PER_UPDATE; a++) {
                double u = across == 0 ? 0 : (double) a / across;
                double ox = (u - 0.5) * 2 * half;
                double wx = x + nx * ox;
                double wz = z + nz * ox;
                if (wz > WATER_MIN_Z) {
                    continue;
                }
                ids.add(clusterId((int) Math.floor(wx / CLUSTER_SIZE), (int) Math.floor(wz / CLUSTER_SIZE)));
            }
        }
        return ids;
    }

    private void expireHidden() {
        long now = System.currentTimeMillis();
        hiddenUntil.entrySet().removeIf(entry -> entry.getValue() <= now);
    }

    private static boolean isValidClusterId(String cellId) {
        if (cellId == null || !cellId.startsWith("m4t3r-cluster:")) {
            return false;
        }
        String[] parts = cellId.split(":");
        if (parts.length != 3) {
            return false;
        }
        try {
            int gz = Integer.parseInt(parts[2]);
            double z = (gz + 0.5) * CLUSTER_SIZE;
            return z <= WATER_MIN_Z;
        } catch (NumberFormatException exception) {
            return false;
        }
    }

    private static String clusterId(int gridX, int gridZ) {
        return "m4t3r-cluster:" + gridX + ":" + gridZ;
    }

    private static final class LastMove {
        private final double x;
        private final double z;
        private final long atMs;

        private LastMove(double x, double z, long atMs) {
            this.x = x;
            this.z = z;
            this.atMs = atMs;
        }
    }

    private static final class RateWindow {
        private long startedAt;
        private int count;

        private RateWindow(long startedAt, int count) {
            this.startedAt = startedAt;
            this.count = count;
        }
    }
}
