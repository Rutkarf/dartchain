package io.dartchain.backend.live;

import io.dartchain.backend.support.CapturingWebSocketSession;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
class LiveUpdateBroadcastServiceTest {

    @Autowired
    private LiveUpdateBroadcastService broadcastService;

    @Test
    void sendSnapshot_writesSnapshotPayload() {
        CapturingWebSocketSession session = new CapturingWebSocketSession("live-test");

        broadcastService.sendSnapshot(session);

        assertFalse(session.getSentPayloads().isEmpty());
        assertTrue(session.getSentPayloads().getFirst().contains("snapshot"));
    }
}
