package io.dartchain.backend.metaverse.arena.ws;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.dartchain.backend.auth.model.UserAccount;
import io.dartchain.backend.auth.security.AuthenticatedUser;
import io.dartchain.backend.auth.security.WebSocketAuthSupport;
import io.dartchain.backend.auth.store.UserAccountStore;
import io.dartchain.backend.config.WebSocketBufferLimits;
import io.dartchain.backend.metaverse.arena.application.InGameRewardsService;
import io.dartchain.backend.metaverse.arena.dto.ArenaEliminationRequest;
import io.dartchain.backend.metaverse.arena.dto.ArenaEliminationResponse;
import io.dartchain.backend.metaverse.arena.model.ArenaPlayerState;
import io.dartchain.backend.metaverse.arena.store.InMemoryArenaLedgerStore;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.math.BigDecimal;
import java.util.Optional;

/**
 * WebSocket dédié MetaVerseBB Arena — ne touche pas /ws/live|chat|peers.
 */
@Component
public class ArenaSocketHandler extends TextWebSocketHandler {

    private static final Logger log = LoggerFactory.getLogger(ArenaSocketHandler.class);

    private final ArenaPresenceRegistry presenceRegistry;
    private final WebSocketAuthSupport webSocketAuthSupport;
    private final UserAccountStore userAccountStore;
    private final InGameRewardsService rewardsService;
    private final InMemoryArenaLedgerStore ledgerStore;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ArenaSocketHandler(
            ArenaPresenceRegistry presenceRegistry,
            WebSocketAuthSupport webSocketAuthSupport,
            UserAccountStore userAccountStore,
            InGameRewardsService rewardsService,
            InMemoryArenaLedgerStore ledgerStore
    ) {
        this.presenceRegistry = presenceRegistry;
        this.webSocketAuthSupport = webSocketAuthSupport;
        this.userAccountStore = userAccountStore;
        this.rewardsService = rewardsService;
        this.ledgerStore = ledgerStore;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        session.setTextMessageSizeLimit(WebSocketBufferLimits.MAX_TEXT_MESSAGE_BUFFER_SIZE);
        Optional<AuthenticatedUser> user = webSocketAuthSupport.resolveFromSession(session);
        if (user.isEmpty()) {
            sendJson(session, errorNode("AUTH_REQUIRED", "Authentification requise pour l’arène."));
            session.close(CloseStatus.NOT_ACCEPTABLE);
            return;
        }
        super.afterConnectionEstablished(session);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        Optional<AuthenticatedUser> auth = webSocketAuthSupport.resolveFromSession(session);
        if (auth.isEmpty()) {
            sendJson(session, errorNode("AUTH_REQUIRED", "Authentification requise."));
            return;
        }
        UserAccount account = userAccountStore.findById(auth.get().getId()).orElse(null);
        if (account == null) {
            sendJson(session, errorNode("ACCOUNT_NOT_FOUND", "Compte introuvable."));
            return;
        }
        JsonNode payload = objectMapper.readTree(message.getPayload());
        String type = payload.path("type").asText("");

        switch (type) {
            case "join" -> handleJoin(session, account, payload);
            case "pose" -> handlePose(session, account, payload);
            case "elimination" -> handleElimination(session, account, payload);
            case "leave" -> handleLeave(session);
            default -> sendJson(session, errorNode("UNKNOWN_TYPE", "type inconnu: " + type));
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        presenceRegistry.unbind(session).ifPresent(userId -> {
            ledgerStore.find(userId).ifPresent(state -> {
                state.setStatus("disconnected");
                ledgerStore.save(state);
            });
            broadcast(playerLeftNode(userId), session.getId());
        });
        super.afterConnectionClosed(session, status);
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
        presenceRegistry.unbind(session);
        super.handleTransportError(session, exception);
    }

    private void handleJoin(WebSocketSession session, UserAccount account, JsonNode payload) throws IOException {
        String displayName = payload.path("displayName").asText(account.getUsername());
        BigDecimal mirror = BigDecimal.valueOf(payload.path("pendingDisplayMirror").asDouble(0));
        ArenaPlayerState state = rewardsService.joinOrRefresh(account, displayName, mirror);
        presenceRegistry.bind(account.getId(), session);
        presenceRegistry.updatePose(account.getId(), new ArenaPresenceRegistry.Pose(0, 0, 5, 0));

        sendJson(session, snapshotNode());
        broadcast(playerJoinedNode(state), session.getId());
        log.info("arena.ws.join userId={}", account.getId());
    }

    private void handlePose(WebSocketSession session, UserAccount account, JsonNode payload) throws IOException {
        if (presenceRegistry.userIdOf(session).isEmpty()) {
            sendJson(session, errorNode("NOT_JOINED", "Envoyez join d’abord."));
            return;
        }
        double x = payload.path("x").asDouble(0);
        double y = payload.path("y").asDouble(0);
        double z = payload.path("z").asDouble(0);
        double ry = payload.path("ry").asDouble(0);

        // Anti-téléport grossier (MVP) : rayon arène ~120 m
        if (Math.hypot(x, z) > 120) {
            sendJson(session, errorNode("INVALID_POSE", "Position hors arène."));
            return;
        }

        presenceRegistry.updatePose(account.getId(), new ArenaPresenceRegistry.Pose(x, y, z, ry));
        ObjectNode node = objectMapper.createObjectNode();
        node.put("type", "player_pose");
        node.put("userId", account.getId());
        node.put("x", x);
        node.put("y", y);
        node.put("z", z);
        node.put("ry", ry);
        broadcast(node, session.getId());
    }

    private void handleElimination(WebSocketSession session, UserAccount account, JsonNode payload) throws IOException {
        String eventId = payload.path("eventId").asText("");
        String victimUserId = payload.path("victimUserId").asText("");
        if (eventId.isBlank() || victimUserId.isBlank()) {
            sendJson(session, errorNode("INVALID_ELIMINATION", "eventId/victimUserId requis."));
            return;
        }
        ArenaEliminationResponse result = rewardsService.applyElimination(
                account,
                new ArenaEliminationRequest(eventId, account.getId(), victimUserId)
        );
        ObjectNode node = objectMapper.createObjectNode();
        node.put("type", "elimination_result");
        node.put("eventId", result.eventId());
        node.put("accepted", result.accepted());
        if (result.reason() != null) {
            node.put("reason", result.reason());
        }
        node.put("killerUserId", result.killerUserId());
        node.put("victimUserId", result.victimUserId());
        node.put("lootAmount", result.lootAmount());
        node.put("killerFaucetBalanceAfter", result.killerFaucetBalanceAfter());
        node.put("victimFaucetBalanceAfter", result.victimFaucetBalanceAfter());
        broadcastAll(node);
    }

    private void handleLeave(WebSocketSession session) throws Exception {
        presenceRegistry.unbind(session).ifPresent(userId -> {
            ledgerStore.find(userId).ifPresent(state -> {
                state.setStatus("disconnected");
                ledgerStore.save(state);
            });
            broadcast(playerLeftNode(userId), session.getId());
        });
        session.close(CloseStatus.NORMAL);
    }

    private ObjectNode snapshotNode() {
        ObjectNode root = objectMapper.createObjectNode();
        root.put("type", "snapshot");
        ArrayNode players = root.putArray("players");
        for (String userId : presenceRegistry.allUserIds()) {
            ledgerStore.find(userId).ifPresent(state -> players.add(playerNode(state)));
        }
        return root;
    }

    private ObjectNode playerJoinedNode(ArenaPlayerState state) {
        ObjectNode root = objectMapper.createObjectNode();
        root.put("type", "player_joined");
        root.set("player", playerNode(state));
        return root;
    }

    private ObjectNode playerLeftNode(String userId) {
        ObjectNode root = objectMapper.createObjectNode();
        root.put("type", "player_left");
        root.put("userId", userId);
        return root;
    }

    private ObjectNode playerNode(ArenaPlayerState state) {
        ObjectNode player = objectMapper.createObjectNode();
        player.put("userId", state.getUserId());
        player.put("displayName", state.getDisplayName());
        player.put("status", state.getStatus());
        player.put("faucetBalance", state.getFaucetBalance());
        player.put("protectedBalance", state.getProtectedBalance());
        player.put("kills", state.getKills());
        player.put("deaths", state.getDeaths());
        ArenaPresenceRegistry.Pose pose = presenceRegistry.poseOf(state.getUserId())
                .orElse(new ArenaPresenceRegistry.Pose(0, 0, 5, 0));
        player.put("x", pose.x());
        player.put("y", pose.y());
        player.put("z", pose.z());
        player.put("ry", pose.ry());
        return player;
    }

    private ObjectNode errorNode(String code, String message) {
        ObjectNode node = objectMapper.createObjectNode();
        node.put("type", "error");
        node.put("code", code);
        node.put("message", message);
        return node;
    }

    private void broadcast(ObjectNode node, String excludeSessionId) {
        String json;
        try {
            json = objectMapper.writeValueAsString(node);
        } catch (IOException e) {
            return;
        }
        TextMessage message = new TextMessage(json);
        for (WebSocketSession session : presenceRegistry.allSessions()) {
            if (!session.isOpen() || session.getId().equals(excludeSessionId)) {
                continue;
            }
            try {
                session.sendMessage(message);
            } catch (IOException ignored) {
                // drop
            }
        }
    }

    private void broadcastAll(ObjectNode node) {
        broadcast(node, "");
    }

    private void sendJson(WebSocketSession session, ObjectNode node) throws IOException {
        if (!session.isOpen()) {
            return;
        }
        session.sendMessage(new TextMessage(objectMapper.writeValueAsString(node)));
    }
}
