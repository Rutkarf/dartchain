package io.dartchain.backend.shared.exception;

/**
 * Phase Z — fonctionnalité désactivée par la configuration produit (mode commercial).
 */
public class FeatureDisabledException extends RuntimeException {

    public FeatureDisabledException(String message) {
        super(message);
    }
}
