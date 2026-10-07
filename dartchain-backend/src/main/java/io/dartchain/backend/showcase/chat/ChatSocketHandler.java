package io.dartchain.backend.showcase.chat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.dartchain.backend.auth.security.AuthenticatedUser;
import io.dartchain.backend.auth.security.WebSocketAuthSupport;
import io.dartchain.backend.showcase.dto.ChatMessageRequest;
import io.dartchain.backend.showcase.dto.ChatMessageResponse;
import io.dartchain.backend.showcase.application.ChatService;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Component
public class ChatSocketHandler extends TextWebSocketHandler {

    private final ChatSessionRegistry sessionRegistry;
    private final ChatService chatService;
    private final WebSocketAuthSupport webSocketAuthSupport;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ChatSocketHandler(
            ChatSessionRegistry sessionRegistry,
            ChatService chatService,
            WebSocketAuthSupport webSocketAuthSupport
    ) {
        this.sessionRegistry = sessionRegistry;
        this.chatService = chatService;
        this.webSocketAuthSupport = webSocketAuthSupport;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        sessionRegistry.add(session);
        sendHistory(session);
        super.afterConnectionEstablished(session);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        JsonNode payload = objectMapper.readTree(message.getPayload());
        String type = payload.path("type").asText("message");

        if ("clear".equals(type)) {
            String roomId = payload.path("roomId").asText(ChatService.DEFAULT_ROOM);
            String resolvedRoom = chatService.clearRoom(roomId);
            broadcastClear(resolvedRoom);
            return;
        }

        if (!"message".equals(type)) {
            return;
        }

        Optional<AuthenticatedUser> user = webSocketAuthSupport.resolveFromSession(session);
        String authorHint = payload.path("author").asText("").trim();
        String text = payload.path("text").asText("").trim();
        String clientId = payload.path("clientId").asText(null);
        String roomId = payload.path("roomId").asText(ChatService.DEFAULT_ROOM);
        String fontKey = textOrNull(payload, "fontKey");
        String fontSize = textOrNull(payload, "fontSize");
        Boolean bold = boolOrNull(payload, "bold");
        Boolean italic = boolOrNull(payload, "italic");
        Boolean underline = boolOrNull(payload, "underline");
        Boolean strikethrough = boolOrNull(payload, "strikethrough");
        String fontColor = textOrNull(payload, "fontColor");
        String highlightColor = textOrNull(payload, "highlightColor");
        String textAlign = textOrNull(payload, "textAlign");
        String styleKey = textOrNull(payload, "styleKey");
        Boolean anonymousFlag = boolOrNull(payload, "anonymous");

        boolean wantsAnonymous;
        if (Boolean.FALSE.equals(anonymousFlag)) {
            wantsAnonymous = false;
        } else if (Boolean.TRUE.equals(anonymousFlag)) {
            wantsAnonymous = true;
        } else {
            wantsAnonymous = ChatService.isAnonymousAuthor(authorHint);
        }

        if (user.isEmpty() && !wantsAnonymous) {
            sendError(session, "Authentification requise pour envoyer un message, ou activez Anonymous.");
            return;
        }

        if (text.isEmpty()) {
            return;
        }

        String author = wantsAnonymous
                ? ChatService.ANONYMOUS_AUTHOR
                : user.map(AuthenticatedUser::getUsername).orElse(ChatService.ANONYMOUS_AUTHOR);

        ChatMessageResponse created = chatService.postMessage(
                new ChatMessageRequest(
                        author,
                        text,
                        clientId,
                        roomId,
                        fontKey,
                        fontSize,
                        bold,
                        italic,
                        underline,
                        strikethrough,
                        fontColor,
                        highlightColor,
                        textAlign,
                        styleKey,
                        wantsAnonymous ? Boolean.TRUE : Boolean.FALSE
                ),
                author
        );

        broadcastChat(created);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        sessionRegistry.remove(session);
        super.afterConnectionClosed(session, status);
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
        sessionRegistry.remove(session);
        super.handleTransportError(session, exception);
    }

    private void sendHistory(WebSocketSession session) throws Exception {
        List<ChatMessageResponse> recent = chatService.getRecentMessages(ChatService.DEFAULT_ROOM, 30);

        Map<String, Object> envelope = new LinkedHashMap<>();
        envelope.put("type", "history");
        envelope.put("data", recent);

        session.sendMessage(new TextMessage(objectMapper.writeValueAsString(envelope)));
    }

    private void sendError(WebSocketSession session, String message) throws Exception {
        Map<String, Object> envelope = new LinkedHashMap<>();
        envelope.put("type", "error");
        envelope.put("message", message);
        session.sendMessage(new TextMessage(objectMapper.writeValueAsString(envelope)));
    }

    private static String textOrNull(JsonNode payload, String field) {
        JsonNode node = payload.get(field);
        if (node == null || node.isNull()) {
            return null;
        }
        String value = node.asText("").trim();
        return value.isEmpty() ? null : value;
    }

    private static Boolean boolOrNull(JsonNode payload, String field) {
        JsonNode node = payload.get(field);
        if (node == null || node.isNull() || !node.isBoolean()) {
            return null;
        }
        return node.asBoolean();
    }

    private void broadcastChat(ChatMessageResponse message) throws Exception {
        Map<String, Object> envelope = new LinkedHashMap<>();
        envelope.put("type", "chat");
        envelope.put("data", message);

        broadcastEnvelope(envelope);
    }

    public void broadcastClear(String roomId) throws Exception {
        Map<String, Object> envelope = new LinkedHashMap<>();
        envelope.put("type", "clear");
        envelope.put("roomId", roomId != null && !roomId.isBlank() ? roomId : ChatService.DEFAULT_ROOM);

        broadcastEnvelope(envelope);
    }

    private void broadcastEnvelope(Map<String, Object> envelope) throws Exception {
        String payload = objectMapper.writeValueAsString(envelope);
        TextMessage textMessage = new TextMessage(payload);

        for (WebSocketSession session : sessionRegistry.getAll()) {
            if (session.isOpen()) {
                session.sendMessage(textMessage);
            }
        }
    }
}
