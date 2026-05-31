package io.dartchain.backend.p2p;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketSession;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

@Component
public class P2pSessionRegistry {

    private final List<WebSocketSession> sessions = new CopyOnWriteArrayList<>();

    public void add(WebSocketSession session) {
        if (session == null) {
            return;
        }

        boolean alreadyPresent = sessions.stream()
                .anyMatch(existing -> existing.getId().equals(session.getId()));

        if (!alreadyPresent) {
            sessions.add(session);
        }
    }

    public void remove(WebSocketSession session) {
        if (session == null) {
            return;
        }

        sessions.removeIf(existing -> existing.getId().equals(session.getId()));
    }

    public List<WebSocketSession> getAll() {
        return List.copyOf(sessions);
    }

    public int count() {
        return sessions.size();
    }
}