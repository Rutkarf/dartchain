package io.dartchain.backend.showcase.dto;

import java.util.List;

public record ChatHistoryResponse(
        String roomId,
        List<ChatMessageResponse> messages
) {}
