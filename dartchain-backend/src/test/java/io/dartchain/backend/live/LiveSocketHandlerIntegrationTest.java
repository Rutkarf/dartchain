package io.dartchain.backend.live;

import io.dartchain.backend.config.WebSocketBufferLimits;
import jakarta.websocket.ContainerProvider;
import jakarta.websocket.WebSocketContainer;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.net.URI;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class LiveSocketHandlerIntegrationTest {

    @Autowired
    private LiveUpdateSessionRegistry sessionRegistry;

    @org.springframework.boot.test.web.server.LocalServerPort
    private int port;

    @Test
    void liveWebSocket_receivesSnapshotOnConnect() throws Exception {
        CountDownLatch latch = new CountDownLatch(1);
        CopyOnWriteArrayList<String> payloads = new CopyOnWriteArrayList<>();

        WebSocketContainer container = ContainerProvider.getWebSocketContainer();
        container.setDefaultMaxTextMessageBufferSize(WebSocketBufferLimits.MAX_TEXT_MESSAGE_BUFFER_SIZE);
        container.setDefaultMaxBinaryMessageBufferSize(WebSocketBufferLimits.MAX_TEXT_MESSAGE_BUFFER_SIZE);

        StandardWebSocketClient client = new StandardWebSocketClient(container);
        WebSocketSession session = client.execute(
                new TextWebSocketHandler() {
                    @Override
                    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
                        payloads.add(message.getPayload());
                        latch.countDown();
                    }
                },
                null,
                URI.create("ws://127.0.0.1:" + port + "/ws/live")
        ).get(10, TimeUnit.SECONDS);

        try {
            assertTrue(latch.await(10, TimeUnit.SECONDS));
            assertFalse(sessionRegistry.getAll().isEmpty());
            assertTrue(payloads.getFirst().contains("snapshot"));
        } finally {
            session.close();
        }
    }
}
