package io.dartchain.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "dartchain.security")
public class SecurityProperties {

    /**
     * Exige les signatures {@code AUTHv1:} pour les pending-tx validées côté serveur (Phase N).
     * Le mode permissif legacy reste disponible via {@code false}.
     */
    private boolean strictPendingSignatures = true;

    public boolean isStrictPendingSignatures() {
        return strictPendingSignatures;
    }

    public void setStrictPendingSignatures(boolean strictPendingSignatures) {
        this.strictPendingSignatures = strictPendingSignatures;
    }
}
