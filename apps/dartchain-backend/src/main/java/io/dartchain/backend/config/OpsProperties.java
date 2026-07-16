package io.dartchain.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "dartchain.ops")
public class OpsProperties {

    /**
     * Restreint /actuator/metrics et /api/ops* (token requis).
     */
    private boolean restrictActuator = false;

    /**
     * Token attendu dans l'en-tête {@code X-Actuator-Token}.
     */
    private String actuatorToken = "";

    /**
     * Seuil d'alerte mempool.
     */
    private int mempoolAlertThreshold = 50;

    /**
     * Phase AE — seuil d'alerte erreurs HTTP cumulées.
     */
    private int httpErrorAlertThreshold = 10;

    /**
     * Phase AE — latence max (ms) avant alerte SLOW_REQUEST.
     */
    private int slowRequestThresholdMs = 2000;

    /**
     * Phase AE — seuil refus RBAC cumulés.
     */
    private int rbacDeniedAlertThreshold = 20;

    public boolean isRestrictActuator() {
        return restrictActuator;
    }

    public void setRestrictActuator(boolean restrictActuator) {
        this.restrictActuator = restrictActuator;
    }

    public String getActuatorToken() {
        return actuatorToken;
    }

    public void setActuatorToken(String actuatorToken) {
        this.actuatorToken = actuatorToken;
    }

    public int getMempoolAlertThreshold() {
        return mempoolAlertThreshold;
    }

    public void setMempoolAlertThreshold(int mempoolAlertThreshold) {
        this.mempoolAlertThreshold = mempoolAlertThreshold;
    }

    public int getHttpErrorAlertThreshold() {
        return httpErrorAlertThreshold;
    }

    public void setHttpErrorAlertThreshold(int httpErrorAlertThreshold) {
        this.httpErrorAlertThreshold = httpErrorAlertThreshold;
    }

    public int getSlowRequestThresholdMs() {
        return slowRequestThresholdMs;
    }

    public void setSlowRequestThresholdMs(int slowRequestThresholdMs) {
        this.slowRequestThresholdMs = slowRequestThresholdMs;
    }

    public int getRbacDeniedAlertThreshold() {
        return rbacDeniedAlertThreshold;
    }

    public void setRbacDeniedAlertThreshold(int rbacDeniedAlertThreshold) {
        this.rbacDeniedAlertThreshold = rbacDeniedAlertThreshold;
    }
}
