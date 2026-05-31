package io.dartchain.backend.live;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

@Component
public class LiveSocketHandler extends TextWebSocketHandler {

    private final LiveUpdateSessionRegistry sessionRegistry;
    private final LiveUpdateBroadcastService broadcastService;

    public LiveSocketHandler(
            LiveUpdateSessionRegistry sessionRegistry,
            LiveUpdateBroadcastService broadcastService
    ) {
        this.sessionRegistry = sessionRegistry;
        this.broadcastService = broadcastService;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        sessionRegistry.add(session);
        broadcastService.sendSnapshot(session);
        super.afterConnectionEstablished(session);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        // Live feed is server-push only; ignore client messages.
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        sessionRegistry.remove(session);
        super.afterConnectionClosed(session, status);
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
        sessionRegistry.remove(session);
        super.handleTransportError(session, exception);
    }
}
