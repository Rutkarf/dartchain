package io.dartchain.backend.peer;

public record PeerView(
        String url,
        String status,
        String message
) {}