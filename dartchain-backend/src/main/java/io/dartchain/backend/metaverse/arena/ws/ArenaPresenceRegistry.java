package io.dartchain.backend.metaverse.arena.ws;

import io.dartchain.backend.metaverse.arena.model.ArenaPlayerState;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketSession;

import java.util.Collection;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Présence arène — isolée de live/chat/peers.
 */
@Component
public class ArenaPresenceRegistry {

    private final Map<String, WebSocketSession> sessionsByUserId = new ConcurrentHashMap<>();
    private final Map<String, String> userIdBySessionId = new ConcurrentHashMap<>();
    private final Map<String, Pose> posesByUserId = new ConcurrentHashMap<>();

    public record Pose(double x, double y, double z, double ry) {
    }

    public synchronized void bind(String userId, WebSocketSession session) {
        WebSocketSession previous = sessionsByUserId.put(userId, session);
        if (previous != null && previous.isOpen() && !previous.getId().equals(session.getId())) {
            try {
                previous.close();
            } catch (Exception ignored) {
                // best-effort
            }
        }
        userIdBySessionId.put(session.getId(), userId);
    }

    public synchronized Optional<String> unbind(WebSocketSession session) {
        String userId = userIdBySessionId.remove(session.getId());
        if (userId == null) {
            return Optional.empty();
        }
        WebSocketSession current = sessionsByUserId.get(userId);
        if (current != null && current.getId().equals(session.getId())) {
            sessionsByUserId.remove(userId);
            posesByUserId.remove(userId);
        }
        return Optional.of(userId);
    }

    public Optional<String> userIdOf(WebSocketSession session) {
        return Optional.ofNullable(userIdBySessionId.get(session.getId()));
    }

    public void updatePose(String userId, Pose pose) {
        posesByUserId.put(userId, pose);
    }

    public Optional<Pose> poseOf(String userId) {
        return Optional.ofNullable(posesByUserId.get(userId));
    }

    public Collection<WebSocketSession> allSessions() {
        return sessionsByUserId.values();
    }

    public Collection<String> allUserIds() {
        return sessionsByUserId.keySet();
    }
}
