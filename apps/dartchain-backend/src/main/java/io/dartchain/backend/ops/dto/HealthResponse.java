package io.dartchain.backend.ops.dto;

public class HealthResponse {

    private boolean ok;
    private String service;
    private String persistenceMode;

    public HealthResponse() {
    }

    public HealthResponse(boolean ok, String service) {
        this.ok = ok;
        this.service = service;
    }

    public HealthResponse(boolean ok, String service, String persistenceMode) {
        this.ok = ok;
        this.service = service;
        this.persistenceMode = persistenceMode;
    }

    public boolean isOk() {
        return ok;
    }

    public void setOk(boolean ok) {
        this.ok = ok;
    }

    public String getService() {
        return service;
    }

    public void setService(String service) {
        this.service = service;
    }

    public String getPersistenceMode() {
        return persistenceMode;
    }

    public void setPersistenceMode(String persistenceMode) {
        this.persistenceMode = persistenceMode;
    }
}