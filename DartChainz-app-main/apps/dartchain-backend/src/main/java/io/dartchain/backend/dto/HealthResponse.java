package io.dartchain.backend.dto;

public class HealthResponse {

    private boolean ok;
    private String service;

    public HealthResponse() {
    }

    public HealthResponse(boolean ok, String service) {
        this.ok = ok;
        this.service = service;
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
}