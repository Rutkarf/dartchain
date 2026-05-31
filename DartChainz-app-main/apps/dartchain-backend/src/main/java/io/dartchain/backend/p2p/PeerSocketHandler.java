package io.dartchain.backend.p2p;

import io.dartchain.backend.service.PeerService;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

@Component
public class PeerSocketHandler extends TextWebSocketHandler {

    private final P2pSessionRegistry sessionRegistry;
    private final P2pService p2pService;
    private final PeerService peerService;

    public PeerSocketHandler(
            P2pSessionRegistry sessionRegistry,
            P2pService p2pService,
            PeerService peerService
    ) {
        this.sessionRegistry = sessionRegistry;
        this.p2pService = p2pService;
        this.peerService = peerService;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        sessionRegistry.add(session);
        peerService.trackInboundSession(session);
        System.out.println("[P2P] Peer connected: " + session.getId() + " -> " + session.getRemoteAddress());
        p2pService.onOpen(session);
        super.afterConnectionEstablished(session);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        p2pService.onMessage(session, message.getPayload());
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        sessionRegistry.remove(session);
        System.out.println("[P2P] Peer disconnected: " + session.getId() + " (" + status + ")");
        super.afterConnectionClosed(session, status);
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
        sessionRegistry.remove(session);
        System.err.println("[P2P] Transport error on session " + session.getId() + ": " + exception.getMessage());
        super.handleTransportError(session, exception);
    }
}