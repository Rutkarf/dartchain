package io.dartchain.backend.service;

import io.dartchain.backend.p2p.P2pService;
import io.dartchain.backend.p2p.P2pSessionRegistry;
import io.dartchain.backend.peer.PeerConnection;
import io.dartchain.backend.peer.PeerStatus;
import io.dartchain.backend.peer.PeerView;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketHttpHeaders;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.net.URI;
import io.dartchain.backend.dto.PeerStatsResponse;
import org.springframework.web.socket.WebSocketSession;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
public class PeerService {

    private final Map<String, PeerConnection> peers = new ConcurrentHashMap<>();
    private final Set<String> knownPeers = ConcurrentHashMap.newKeySet();
    private final StandardWebSocketClient webSocketClient = new StandardWebSocketClient();
    private final P2pSessionRegistry sessionRegistry;
    private final P2pService p2pService;

    public PeerService(P2pSessionRegistry sessionRegistry, P2pService p2pService) {
        this.sessionRegistry = sessionRegistry;
        this.p2pService = p2pService;
    }

    public List<PeerConnection> getAll() {
        return peers.values()
                .stream()
                .sorted((a, b) -> a.getUrl().compareToIgnoreCase(b.getUrl()))
                .collect(Collectors.toList());
    }

    public List<PeerView> getPeers() {
        return getAll().stream()
                .map(peer -> new PeerView(
                        peer.getUrl(),
                        peer.getStatus().name(),
                        peer.getMessage()
                ))
                .collect(Collectors.toList());
    }

    public PeerStatsResponse getStats() {
        int active = sessionRegistry.count();
        int total = Math.max(knownPeers.size(), peers.size());
        return new PeerStatsResponse(active, total);
    }

    public void trackInboundSession(WebSocketSession session) {
        trackPeer(resolveSessionKey(session));
    }

    public PeerConnection addAndConnect(String peerUrl) {
        String normalized = normalize(peerUrl);

        if (peers.containsKey(normalized)) {
            throw new IllegalArgumentException("Peer already exists: " + normalized);
        }

        PeerConnection peer = new PeerConnection(
                normalized,
                PeerStatus.CONNECTING,
                "Connexion en cours..."
        );

        peers.put(normalized, peer);
        trackPeer(normalized);
        connect(peer);

        return peer;
    }

    public PeerConnection reconnect(String peerUrl) {
        String normalized = normalize(peerUrl);

        PeerConnection peer = peers.get(normalized);

        if (peer == null) {
            throw new IllegalArgumentException("Unknown peer: " + normalized);
        }

        peer.setStatus(PeerStatus.CONNECTING);
        peer.setMessage("Reconnexion en cours...");
        connect(peer);

        return peer;
    }

    private void connect(PeerConnection peer) {
        try {
            webSocketClient.execute(
                    new TextWebSocketHandler() {
                        @Override
                        public void afterConnectionEstablished(WebSocketSession session) {
                            sessionRegistry.add(session);
                            trackPeer(peer.getUrl());
                            peer.setStatus(PeerStatus.CONNECTED);
                            peer.setMessage("Connecté");
                            p2pService.onOpen(session);
                        }

                        @Override
                        protected void handleTextMessage(WebSocketSession session, TextMessage message) {
                            p2pService.onMessage(session, message.getPayload());
                        }

                        @Override
                        public void handleTransportError(WebSocketSession session, Throwable exception) {
                            sessionRegistry.remove(session);
                            peer.setStatus(PeerStatus.ERROR);
                            peer.setMessage(safeMessage(exception, "Erreur de transport WebSocket"));
                        }

                        @Override
                        public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
                            sessionRegistry.remove(session);
                            peer.setStatus(PeerStatus.DISCONNECTED);
                            peer.setMessage("Connexion fermée");
                        }
                    },
                    new WebSocketHttpHeaders(),
                    URI.create(peer.getUrl())
            ).whenComplete((session, error) -> {
                if (error != null) {
                    peer.setStatus(PeerStatus.ERROR);
                    peer.setMessage(safeMessage(error, "Impossible de se connecter au peer"));
                }
            });
        } catch (Exception exception) {
            peer.setStatus(PeerStatus.ERROR);
            peer.setMessage(safeMessage(exception, "Impossible de se connecter au peer"));
        }
    }

    private void trackPeer(String identifier) {
        if (!StringUtils.hasText(identifier)) {
            return;
        }

        knownPeers.add(identifier.trim());
    }

    private String resolveSessionKey(WebSocketSession session) {
        if (session == null) {
            return "";
        }

        if (session.getRemoteAddress() != null) {
            return session.getRemoteAddress().toString();
        }

        return session.getId();
    }

    private String normalize(String peerUrl) {
        if (!StringUtils.hasText(peerUrl)) {
            throw new IllegalArgumentException("Peer is required");
        }

        String normalized = peerUrl.trim();

        URI uri = URI.create(normalized);
        String scheme = uri.getScheme();

        if (!"ws".equalsIgnoreCase(scheme) && !"wss".equalsIgnoreCase(scheme)) {
            throw new IllegalArgumentException("Peer must use ws:// or wss://");
        }

        if (!StringUtils.hasText(uri.getHost())) {
            throw new IllegalArgumentException("Peer host is required");
        }

        return normalized;
    }

    private String safeMessage(Throwable error, String fallback) {
        if (error == null || !StringUtils.hasText(error.getMessage())) {
            return fallback;
        }

        return error.getMessage();
    }
}