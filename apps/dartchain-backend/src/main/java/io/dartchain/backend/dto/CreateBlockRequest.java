package io.dartchain.backend.dto;

import jakarta.validation.constraints.NotBlank;

public class CreateBlockRequest {

    @NotBlank(message = "data is required")
    private String data;

    public CreateBlockRequest() {
    }

    public String getData() {
        return data;
    }

    public void setData(String data) {
        this.data = data;
    }
}