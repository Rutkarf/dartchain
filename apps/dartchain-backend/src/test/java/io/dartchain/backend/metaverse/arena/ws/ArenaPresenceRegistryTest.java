package io.dartchain.backend.metaverse.arena.ws;

import org.junit.jupiter.api.Test;
import org.springframework.web.socket.WebSocketSession;

import java.net.URI;
import java.security.Principal;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ArenaPresenceRegistryTest {

    @Test
    void bindUnbindTracksUsersAndPoses() {
        ArenaPresenceRegistry registry = new ArenaPresenceRegistry();
        WebSocketSession session = mockSession("s1");

        registry.bind("u1", session);
        registry.updatePose("u1", new ArenaPresenceRegistry.Pose(1, 0, 2, 0.5));

        assertThat(registry.userIdOf(session)).contains("u1");
        assertThat(registry.poseOf("u1")).contains(new ArenaPresenceRegistry.Pose(1, 0, 2, 0.5));
        assertThat(registry.allUserIds()).containsExactly("u1");

        assertThat(registry.unbind(session)).contains("u1");
        assertThat(registry.userIdOf(session)).isEmpty();
        assertThat(registry.poseOf("u1")).isEmpty();
    }

    private static WebSocketSession mockSession(String id) {
        WebSocketSession session = mock(WebSocketSession.class);
        when(session.getId()).thenReturn(id);
        when(session.isOpen()).thenReturn(true);
        return session;
    }
}
