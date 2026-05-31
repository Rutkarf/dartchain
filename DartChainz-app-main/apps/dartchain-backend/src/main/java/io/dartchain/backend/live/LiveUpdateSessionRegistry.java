package io.dartchain.backend.live;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketSession;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

@Component
public class LiveUpdateSessionRegistry {

    private final List<WebSocketSession> sessions = new CopyOnWriteArrayList<>();

    public void add(WebSocketSession session) {
        sessions.add(session);
    }

    public void remove(WebSocketSession session) {
        sessions.remove(session);
    }

    public List<WebSocketSession> getAll() {
        return List.copyOf(sessions);
    }
}
