package io.dartchain.backend.showcase.service;

import io.dartchain.backend.showcase.chat.store.ChatMessageStore;
import io.dartchain.backend.showcase.dto.ChatMessageRequest;
import io.dartchain.backend.showcase.dto.ChatMessageResponse;
import io.dartchain.backend.showcase.model.ChatMessage;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class ChatService {

    public static final String DEFAULT_ROOM = "global";
    public static final String ANONYMOUS_AUTHOR = "Anonymous";

    public static boolean isAnonymousAuthor(String author) {
        if (author == null || author.isBlank()) {
            return false;
        }
        String value = author.trim();
        return value.equalsIgnoreCase(ANONYMOUS_AUTHOR)
                || value.matches("(?i)guest(-\\d+)?");
    }

    public static boolean wantsAnonymousPost(ChatMessageRequest request) {
        if (request == null) {
            return false;
        }
        if (Boolean.FALSE.equals(request.anonymous())) {
            return false;
        }
        if (Boolean.TRUE.equals(request.anonymous())) {
            return true;
        }
        return isAnonymousAuthor(request.author());
    }

    private static final Set<String> FONT_KEYS = Set.of(
            "orbit", "arial", "calibri", "times", "georgia", "verdana",
            "trebuchet", "comic", "courier", "impact", "script",
            "roboto", "mono", "pixel"
    );
    private static final Set<String> STYLE_KEYS =
            Set.of("neon", "polaroid", "sticker", "retro", "minimal");
    private static final Set<String> FONT_SIZES = Set.of(
            "8", "9", "10", "11", "12", "14", "16", "18", "20", "22", "24", "26", "28", "36", "48", "72"
    );
    private static final Set<String> TEXT_ALIGNS = Set.of("left", "center", "right", "justify");
    private static final Pattern HEX_COLOR = Pattern.compile("^#[0-9A-Fa-f]{6}$");

    private static final int MAX_MESSAGES = 200;

    private final ChatMessageStore chatMessageStore;
    private final CopyOnWriteArrayList<ChatMessage> messages = new CopyOnWriteArrayList<>();

    public ChatService(ChatMessageStore chatMessageStore) {
        this.chatMessageStore = chatMessageStore;
    }

    @PostConstruct
    public void loadMessages() {
        messages.clear();
        messages.addAll(chatMessageStore.findAll());
    }

    public List<ChatMessageResponse> getRecentMessages(String roomId, int limit) {
        String resolvedRoom = resolveRoom(roomId);

        List<ChatMessage> roomMessages = messages.stream()
                .filter(message -> resolvedRoom.equals(message.getRoomId()))
                .sorted(Comparator.comparing(ChatMessage::getSentAt))
                .toList();

        int fromIndex = Math.max(0, roomMessages.size() - Math.max(1, limit));

        return roomMessages.subList(fromIndex, roomMessages.size()).stream()
                .map(this::toResponse)
                .collect(Collectors.toCollection(ArrayList::new));
    }

    public String clearRoom(String roomId) {
        String resolvedRoom = resolveRoom(roomId);
        messages.removeIf(message -> resolvedRoom.equals(message.getRoomId()));
        chatMessageStore.replaceAll(List.copyOf(messages));
        return resolvedRoom;
    }

    public ChatMessageResponse postMessage(ChatMessageRequest request) {
        return postMessage(request, request.author());
    }

    public ChatMessageResponse postMessage(ChatMessageRequest request, String authorUsername) {
        String roomId = resolveRoom(request.roomId());
        String author = authorUsername != null ? authorUsername.trim() : "";
        String text = request.text().trim();

        if (author.isEmpty() || text.isEmpty()) {
            throw new IllegalArgumentException("Author and text are required");
        }

        ChatMessage message = new ChatMessage(
                UUID.randomUUID().toString(),
                roomId,
                author,
                text,
                Instant.now(),
                request.clientId(),
                normalizeFont(request.fontKey()),
                normalizeFontSize(request.fontSize()),
                Boolean.TRUE.equals(request.bold()),
                Boolean.TRUE.equals(request.italic()),
                Boolean.TRUE.equals(request.underline()),
                Boolean.TRUE.equals(request.strikethrough()),
                normalizeColor(request.fontColor(), "#f4f0ff"),
                normalizeHighlight(request.highlightColor()),
                normalizeAlign(request.textAlign()),
                normalizeStyle(request.styleKey())
        );

        messages.add(message);
        chatMessageStore.save(message);
        trimMessages();

        return toResponse(message);
    }

    private void trimMessages() {
        while (messages.size() > MAX_MESSAGES) {
            messages.remove(0);
        }
        chatMessageStore.replaceAll(messages);
    }

    private String resolveRoom(String roomId) {
        if (roomId == null || roomId.isBlank()) {
            return DEFAULT_ROOM;
        }
        return roomId.trim();
    }

    public ChatMessageResponse toResponse(ChatMessage message) {
        return new ChatMessageResponse(
                message.getId(),
                message.getRoomId(),
                message.getAuthor(),
                message.getText(),
                message.getSentAt().toString(),
                message.getClientId(),
                message.getFontKey(),
                message.getFontSize(),
                message.isBold(),
                message.isItalic(),
                message.isUnderline(),
                message.isStrikethrough(),
                message.getFontColor(),
                message.getHighlightColor(),
                message.getTextAlign(),
                message.getStyleKey()
        );
    }

    private static String normalizeFont(String raw) {
        if (raw == null || raw.isBlank()) {
            return "arial";
        }
        String key = raw.trim().toLowerCase();
        return switch (key) {
            case "roboto" -> "arial";
            case "mono" -> "courier";
            case "pixel" -> "impact";
            default -> FONT_KEYS.contains(key) ? key : "arial";
        };
    }

    private static String normalizeFontSize(String raw) {
        if (raw == null || raw.isBlank()) {
            return "11";
        }
        String key = raw.trim();
        return FONT_SIZES.contains(key) ? key : "11";
    }

    private static String normalizeStyle(String raw) {
        if (raw == null || raw.isBlank()) {
            return "neon";
        }
        String key = raw.trim().toLowerCase();
        return STYLE_KEYS.contains(key) ? key : "neon";
    }

    private static String normalizeAlign(String raw) {
        if (raw == null || raw.isBlank()) {
            return "left";
        }
        String key = raw.trim().toLowerCase();
        return TEXT_ALIGNS.contains(key) ? key : "left";
    }

    private static String normalizeColor(String raw, String fallback) {
        if (raw == null || raw.isBlank()) {
            return fallback;
        }
        String value = raw.trim();
        if (!value.startsWith("#")) {
            value = "#" + value;
        }
        return HEX_COLOR.matcher(value).matches() ? value.toLowerCase() : fallback;
    }

    private static String normalizeHighlight(String raw) {
        if (raw == null || raw.isBlank() || "transparent".equalsIgnoreCase(raw.trim())) {
            return "transparent";
        }
        return normalizeColor(raw, "transparent");
    }
}
