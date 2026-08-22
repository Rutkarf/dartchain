package io.dartchain.backend.peers.application;

import io.dartchain.backend.auth.AuthService;
import io.dartchain.backend.auth.AuthTokenResolver;
import io.dartchain.backend.auth.security.AuthenticatedUser;
import io.dartchain.backend.auth.security.WebSocketAuthSupport;
import io.dartchain.backend.config.WebSocketBufferLimits;
import io.dartchain.backend.peers.dto.PeerStatsResponse;
import io.dartchain.backend.p2p.P2pService;
import io.dartchain.backend.p2p.P2pSessionRegistry;
import io.dartchain.backend.peer.PeerConnection;
import io.dartchain.backend.peer.PeerMetricsRegistry;
import io.dartchain.backend.peer.PeerMetricsRegistry.PeerMetricsSnapshot;
import io.dartchain.backend.peer.PeerStatus;
import io.dartchain.backend.peer.PeerView;
import io.dartchain.backend.ops.ApplicationMetricsCollector;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketHttpHeaders;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.net.URI;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
public class PeerService {

    private final Map<String, PeerConnection> peers = new ConcurrentHashMap<>();
    private final Map<String, WebSocketSession> outboundSessions = new ConcurrentHashMap<>();
    private final Set<String> knownPeers = ConcurrentHashMap.newKeySet();
    private final StandardWebSocketClient webSocketClient = new StandardWebSocketClient();
    private final P2pSessionRegistry sessionRegistry;
    private final P2pService p2pService;
    private final PeerMetricsRegistry metricsRegistry;
    private final WebSocketAuthSupport webSocketAuthSupport;
    private final AuthTokenResolver authTokenResolver;
    private final ApplicationMetricsCollector metricsCollector;

    public PeerService(
            P2pSessionRegistry sessionRegistry,
            P2pService p2pService,
            PeerMetricsRegistry metricsRegistry,
            WebSocketAuthSupport webSocketAuthSupport,
            AuthTokenResolver authTokenResolver,
            ApplicationMetricsCollector metricsCollector
    ) {
        this.sessionRegistry = sessionRegistry;
        this.p2pService = p2pService;
        this.metricsRegistry = metricsRegistry;
        this.webSocketAuthSupport = webSocketAuthSupport;
        this.authTokenResolver = authTokenResolver;
        this.metricsCollector = metricsCollector;
    }

    public List<PeerConnection> getAll() {
        return peers.values()
                .stream()
                .sorted((a, b) -> a.getUrl().compareToIgnoreCase(b.getUrl()))
                .collect(Collectors.toList());
    }

    public List<PeerView> getPeers() {
        return getAll().stream()
                .map(this::toPeerRecord)
                .collect(Collectors.toList());
    }

    public PeerStatsResponse getStats() {
        // Compte uniquement les peers enregistrés (pas les sessions WS UI / inbound).
        // Sinon un peer local (ws://localhost) compte 2 : outbound + inbound.
        List<PeerConnection> allPeers = getAll();
        int total = allPeers.size();
        long connected = allPeers.stream()
                .filter(peer -> peer.getStatus() == PeerStatus.CONNECTED)
                .count();
        int active = (int) connected;

        List<Long> latencies = allPeers.stream()
                .filter(peer -> peer.getStatus() == PeerStatus.CONNECTED)
                .map(peer -> metricsRegistry.getSnapshot(peer.getUrl()).latencyMs())
                .filter(latency -> latency != null && latency > 0)
                .toList();

        Long avgLatencyMs = latencies.isEmpty()
                ? null
                : Math.round(latencies.stream().mapToLong(Long::longValue).average().orElse(0));

        Integer networkLoadPercent = total == 0
                ? 0
                : (int) Math.round((connected * 100.0) / total);

        if (connected > 0 && networkLoadPercent < 12) {
            networkLoadPercent = 12;
        }

        return new PeerStatsResponse(active, total, avgLatencyMs, networkLoadPercent);
    }

    public void trackInboundSession(WebSocketSession session) {
        String peerKey = resolveSessionKey(session);
        trackPeer(peerKey);
        metricsRegistry.bindSession(session, peerKey);
        metricsRegistry.recordInboundConnected(session);
    }

    public PeerConnection addAndConnect(String peerUrl) {
        return addAndConnect(peerUrl, null);
    }

    public PeerConnection addAndConnect(String peerUrl, String authorizationHeader) {
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
        metricsRegistry.recordOutboundConnectStarted(normalized);
        metricsCollector.recordPeerRegistered(normalized);
        connect(peer, authorizationHeader);

        return peer;
    }

    public PeerConnection reconnect(String peerUrl) {
        return reconnect(peerUrl, null);
    }

    public PeerConnection reconnect(String peerUrl, String authorizationHeader) {
        String normalized = normalize(peerUrl);

        PeerConnection peer = peers.get(normalized);

        if (peer == null) {
            throw new IllegalArgumentException("Unknown peer: " + normalized);
        }

        peer.setStatus(PeerStatus.CONNECTING);
        peer.setMessage("Reconnexion en cours...");
        metricsRegistry.recordOutboundConnectStarted(normalized);
        connect(peer, authorizationHeader);

        return peer;
    }

    public PeerConnection disconnect(String peerUrl) {
        String normalized = normalize(peerUrl);

        PeerConnection peer = peers.get(normalized);
        if (peer == null) {
            throw new IllegalArgumentException("Unknown peer: " + normalized);
        }

        closeOutboundSession(normalized);
        peers.remove(normalized);
        peer.setStatus(PeerStatus.DISCONNECTED);
        peer.setMessage("Peer déconnecté");

        return peer;
    }

    private void connect(PeerConnection peer) {
        connect(peer, null);
    }

    private void connect(PeerConnection peer, String authorizationHeader) {
        Optional<AuthenticatedUser> authenticatedUser = resolveAuthenticatedUser(authorizationHeader);

        try {
            URI targetUri = URI.create(withAccessToken(peer.getUrl(), authorizationHeader));
            webSocketClient.execute(
                    new TextWebSocketHandler() {
                        @Override
                        public void afterConnectionEstablished(WebSocketSession session) {
                            session.setTextMessageSizeLimit(WebSocketBufferLimits.MAX_TEXT_MESSAGE_BUFFER_SIZE);
                            authenticatedUser.ifPresent(
                                    user -> webSocketAuthSupport.attachToAttributes(session.getAttributes(), user)
                            );
                            sessionRegistry.add(session);
                            outboundSessions.put(peer.getUrl(), session);
                            metricsRegistry.bindSession(session, peer.getUrl());
                            trackPeer(peer.getUrl());
                            peer.setStatus(PeerStatus.CONNECTED);
                            peer.setMessage("Connecté");
                            metricsRegistry.recordOutboundConnected(peer.getUrl());
                            p2pService.onOpen(session);
                        }

                        @Override
                        protected void handleTextMessage(WebSocketSession session, TextMessage message) {
                            p2pService.onMessage(session, message.getPayload());
                        }

                        @Override
                        public void handleTransportError(WebSocketSession session, Throwable exception) {
                            sessionRegistry.remove(session);
                            outboundSessions.remove(peer.getUrl(), session);
                            metricsRegistry.unbindSession(session);
                            peer.setStatus(PeerStatus.ERROR);
                            peer.setMessage(safeMessage(exception, "Erreur de transport WebSocket"));
                        }

                        @Override
                        public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
                            sessionRegistry.remove(session);
                            outboundSessions.remove(peer.getUrl(), session);
                            metricsRegistry.unbindSession(session);
                            peer.setStatus(PeerStatus.DISCONNECTED);
                            peer.setMessage("Connexion fermée");
                        }
                    },
                    new WebSocketHttpHeaders(),
                    targetUri
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

    private PeerView toPeerRecord(PeerConnection peer) {
        PeerMetricsSnapshot metrics = metricsRegistry.getSnapshot(peer.getUrl());
        Integer syncPercent = metrics.syncPercent() != null
                ? metrics.syncPercent()
                : metricsRegistry.resolveSyncPercent(peer.getUrl(), peer.getStatus());

        return new PeerView(
                peer.getUrl(),
                peer.getStatus().name(),
                peer.getMessage(),
                metrics.latencyMs(),
                metrics.chainHeight(),
                metrics.localChainHeight(),
                syncPercent,
                metrics.lastSyncAt(),
                metrics.activityPoints()
        );
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

    private Optional<AuthenticatedUser> resolveAuthenticatedUser(String authorizationHeader) {
        if (!StringUtils.hasText(authorizationHeader)) {
            return Optional.empty();
        }

        return authTokenResolver.resolveAccount(authorizationHeader).map(AuthenticatedUser::new);
    }

    private String withAccessToken(String peerUrl, String authorizationHeader) {
        String token = AuthService.extractToken(authorizationHeader);
        if (!StringUtils.hasText(token)) {
            return peerUrl;
        }

        String encoded = java.net.URLEncoder.encode(token, java.nio.charset.StandardCharsets.UTF_8);
        if (peerUrl.contains("?")) {
            return peerUrl + "&access_token=" + encoded;
        }

        return peerUrl + "?access_token=" + encoded;
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

    private void closeOutboundSession(String peerUrl) {
        WebSocketSession session = outboundSessions.remove(peerUrl);
        if (session == null) {
            return;
        }

        sessionRegistry.remove(session);
        metricsRegistry.unbindSession(session);

        if (session.isOpen()) {
            try {
                session.close(CloseStatus.NORMAL);
            } catch (Exception ignored) {
                // Session cleanup continues below.
            }
        }
    }

    private String safeMessage(Throwable error, String fallback) {
        if (error == null || !StringUtils.hasText(error.getMessage())) {
            return fallback;
        }

        return error.getMessage();
    }
}
