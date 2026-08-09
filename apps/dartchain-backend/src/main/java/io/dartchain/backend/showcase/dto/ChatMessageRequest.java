package io.dartchain.backend.showcase.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChatMessageRequest(
        @NotBlank @Size(min = 1, max = 32) String author,
        @NotBlank @Size(min = 1, max = 500) String text,
        String clientId,
        String roomId,
        @Size(max = 24) String fontKey,
        @Size(max = 4) String fontSize,
        Boolean bold,
        Boolean italic,
        Boolean underline,
        Boolean strikethrough,
        @Size(max = 16) String fontColor,
        @Size(max = 16) String highlightColor,
        @Size(max = 12) String textAlign,
        @Size(max = 16) String styleKey,
        Boolean anonymous
) {}
