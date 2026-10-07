package io.dartchain.backend.showcase.dto;

public record ChatMessageResponse(
        String id,
        String roomId,
        String author,
        String text,
        String sentAt,
        String clientId,
        String fontKey,
        String fontSize,
        boolean bold,
        boolean italic,
        boolean underline,
        boolean strikethrough,
        String fontColor,
        String highlightColor,
        String textAlign,
        String styleKey
) {}
