package io.dartchain.backend.m4t3r.model;

import io.dartchain.backend.m4t3r.dto.WorldPoint;

import java.math.BigDecimal;

/**
 * Résultat de validation du mouvement joueur côté serveur.
 * La vitesse mesurée provient uniquement des positions serveur, jamais du client.
 */
public class MovementValidation {

    private WorldPoint previousServerPosition;
    private WorldPoint currentServerPosition;
    private BigDecimal measuredSpeed = BigDecimal.ZERO;
    private BigDecimal maxAllowedSpeed = BigDecimal.ZERO;
    private BigDecimal acceleration = BigDecimal.ZERO;
    private double distanceValidated;
    private boolean valid;
    private String rejectionReason;

    public WorldPoint getPreviousServerPosition() {
        return previousServerPosition;
    }

    public void setPreviousServerPosition(WorldPoint previousServerPosition) {
        this.previousServerPosition = previousServerPosition;
    }

    public WorldPoint getCurrentServerPosition() {
        return currentServerPosition;
    }

    public void setCurrentServerPosition(WorldPoint currentServerPosition) {
        this.currentServerPosition = currentServerPosition;
    }

    public BigDecimal getMeasuredSpeed() {
        return measuredSpeed;
    }

    public void setMeasuredSpeed(BigDecimal measuredSpeed) {
        this.measuredSpeed = measuredSpeed;
    }

    public BigDecimal getMaxAllowedSpeed() {
        return maxAllowedSpeed;
    }

    public void setMaxAllowedSpeed(BigDecimal maxAllowedSpeed) {
        this.maxAllowedSpeed = maxAllowedSpeed;
    }

    public BigDecimal getAcceleration() {
        return acceleration;
    }

    public void setAcceleration(BigDecimal acceleration) {
        this.acceleration = acceleration;
    }

    public double getDistanceValidated() {
        return distanceValidated;
    }

    public void setDistanceValidated(double distanceValidated) {
        this.distanceValidated = distanceValidated;
    }

    public boolean isValid() {
        return valid;
    }

    public void setValid(boolean valid) {
        this.valid = valid;
    }

    public String getRejectionReason() {
        return rejectionReason;
    }

    public void setRejectionReason(String rejectionReason) {
        this.rejectionReason = rejectionReason;
    }

    public static MovementValidation rejected(String reason) {
        MovementValidation validation = new MovementValidation();
        validation.setValid(false);
        validation.setRejectionReason(reason);
        return validation;
    }

    public static MovementValidation accepted(
            WorldPoint previous,
            WorldPoint current,
            BigDecimal measuredSpeed,
            BigDecimal maxAllowedSpeed,
            double distance,
            BigDecimal acceleration
    ) {
        MovementValidation validation = new MovementValidation();
        validation.setPreviousServerPosition(previous);
        validation.setCurrentServerPosition(current);
        validation.setMeasuredSpeed(measuredSpeed);
        validation.setMaxAllowedSpeed(maxAllowedSpeed);
        validation.setDistanceValidated(distance);
        validation.setAcceleration(acceleration);
        validation.setValid(true);
        return validation;
    }
}
