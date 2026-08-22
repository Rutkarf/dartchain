package io.dartchain.backend.m4t3r;

import io.dartchain.backend.auth.model.UserAccount;
import io.dartchain.backend.m4t3r.config.M4t3rRewardConfig;
import io.dartchain.backend.m4t3r.dto.M4t3rTrailPickupRequest;
import io.dartchain.backend.m4t3r.dto.WorldPoint;
import io.dartchain.backend.m4t3r.model.MovementValidation;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Validation autoritaire position / vitesse / nonce pour les récompenses M4T3R.
 */
@Service
public class M4t3rRewardValidationService {

    private static final double MAX_ACCELERATION_MPS2 = 25.0;

    private final M4t3rRewardConfig config;
    private final M4t3rNonceStore nonceStore;
    private final Map<String, LastMove> lastMoves = new ConcurrentHashMap<>();

    public M4t3rRewardValidationService(M4t3rRewardConfig config, M4t3rNonceStore nonceStore) {
        this.config = config;
        this.nonceStore = nonceStore;
    }

    public MovementValidation validateMovement(String playerId, M4t3rTrailPickupRequest request) {
        WorldPoint previous = request.previousPosition();
        WorldPoint current = request.currentPosition();
        if (previous == null || current == null) {
            return MovementValidation.rejected("INVALID_POSITION");
        }

        double step = Math.hypot(current.x() - previous.x(), current.z() - previous.z());
        if (step < 0.02) {
            return MovementValidation.rejected("STEP_TOO_SMALL");
        }
        if (step > M4t3rTrailService.MAX_STEP_METERS) {
            return MovementValidation.rejected("TELEPORT_DETECTED");
        }

        long now = System.currentTimeMillis();
        BigDecimal measuredSpeed = BigDecimal.ZERO;
        BigDecimal acceleration = BigDecimal.ZERO;
        LastMove last = lastMoves.get(playerId);

        if (last != null) {
            double dt = (now - last.atMs) / 1000.0;
            double fromLast = Math.hypot(current.x() - last.x, current.z() - last.z);
            if (dt > 0.02) {
                double speed = fromLast / dt;
                measuredSpeed = BigDecimal.valueOf(speed).setScale(3, RoundingMode.HALF_UP);
                if (speed > M4t3rTrailService.MAX_SPEED_METERS_PER_SECOND) {
                    return MovementValidation.rejected("SPEED_TOO_HIGH");
                }
                if (last.speedMps > 0 && dt > 0.02) {
                    double accel = Math.abs(speed - last.speedMps) / dt;
                    acceleration = BigDecimal.valueOf(accel).setScale(3, RoundingMode.HALF_UP);
                    if (accel > MAX_ACCELERATION_MPS2) {
                        return MovementValidation.rejected("ACCELERATION_TOO_HIGH");
                    }
                }
            }
        }

        lastMoves.put(playerId, new LastMove(current.x(), current.z(), now, measuredSpeed.doubleValue()));

        if (measuredSpeed.compareTo(config.getMaxSpeedMps()) > 0) {
            return MovementValidation.rejected("SPEED_TOO_HIGH");
        }

        return MovementValidation.accepted(
                previous,
                current,
                measuredSpeed,
                config.getMaxSpeedMps(),
                step,
                acceleration
        );
    }

    public String validateNonce(String playerId, M4t3rTrailPickupRequest request) {
        String nonce = request.nonce();
        if (nonce == null || nonce.isBlank()) {
            nonce = request.playerId() + ":" + request.timestamp();
        }
        if (!nonceStore.register(playerId, nonce)) {
            return "INVALID_NONCE";
        }
        return null;
    }

    public String validateWallet(UserAccount account) {
        if (account == null) {
            return "NOT_AUTHENTICATED";
        }
        if (account.getWalletAddress() == null || account.getWalletAddress().isBlank()) {
            return "WALLET_NOT_LINKED";
        }
        return null;
    }

    private static final class LastMove {
        private final double x;
        private final double z;
        private final long atMs;
        private final double speedMps;

        private LastMove(double x, double z, long atMs, double speedMps) {
            this.x = x;
            this.z = z;
            this.atMs = atMs;
            this.speedMps = speedMps;
        }
    }
}
