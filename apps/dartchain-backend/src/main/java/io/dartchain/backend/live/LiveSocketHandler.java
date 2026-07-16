package io.dartchain.backend.live;

import io.dartchain.backend.config.WebSocketBufferLimits;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.time.Instant;

@Component
public class LiveSocketHandler extends TextWebSocketHandler {

    private static final long INITIAL_SNAPSHOT_DELAY_MS = 250L;

    private final LiveUpdateSessionRegistry sessionRegistry;
    private final LiveUpdateBroadcastService broadcastService;
    private final TaskScheduler taskScheduler;

    public LiveSocketHandler(
            LiveUpdateSessionRegistry sessionRegistry,
            LiveUpdateBroadcastService broadcastService,
            TaskScheduler taskScheduler
    ) {
        this.sessionRegistry = sessionRegistry;
        this.broadcastService = broadcastService;
        this.taskScheduler = taskScheduler;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        session.setTextMessageSizeLimit(WebSocketBufferLimits.MAX_TEXT_MESSAGE_BUFFER_SIZE);
        sessionRegistry.add(session);
        taskScheduler.schedule(
                () -> broadcastService.sendSnapshot(session),
                Instant.now().plusMillis(INITIAL_SNAPSHOT_DELAY_MS)
        );
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
