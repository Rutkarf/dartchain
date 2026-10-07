package io.dartchain.backend.showcase.chat;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.dartchain.backend.showcase.chat.store.ChatMessageStore;
import io.dartchain.backend.showcase.model.ChatMessage;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

@Component
@ConditionalOnProperty(name = "dartchain.persistence.mode", havingValue = "memory", matchIfMissing = true)
public class JsonChatMessageStore implements ChatMessageStore {

    private static final Logger log = LoggerFactory.getLogger(JsonChatMessageStore.class);

    private final ObjectMapper objectMapper;
    private final Path storePath;
    private final List<ChatMessage> messages = new ArrayList<>();

    public JsonChatMessageStore(
            ObjectMapper objectMapper,
            @Value("${chat.messages.path:data/chat-messages.json}") String storePath
    ) {
        this.objectMapper = objectMapper;
        this.storePath = Path.of(storePath);
    }

    @PostConstruct
    public void loadFromDisk() {
        if (!Files.exists(storePath)) {
            return;
        }

        try {
            ChatMessageSnapshot snapshot = objectMapper.readValue(
                    Files.readString(storePath),
                    ChatMessageSnapshot.class
            );
            synchronized (messages) {
                messages.clear();
                messages.addAll(snapshot.getMessages());
            }
        } catch (IOException exception) {
            throw new IllegalStateException("Unable to load chat messages from " + storePath, exception);
        }
    }

    @Override
    public synchronized List<ChatMessage> findAll() {
        return messages.stream().map(this::cloneMessage).toList();
    }

    @Override
    public synchronized void save(ChatMessage message) {
        messages.add(cloneMessage(message));
        persist();
    }

    @Override
    public synchronized void replaceAll(List<ChatMessage> items) {
        messages.clear();
        if (items != null) {
            messages.addAll(items.stream().map(this::cloneMessage).toList());
        }
        persist();
    }

    private void persist() {
        try {
            if (storePath.getParent() != null) {
                Files.createDirectories(storePath.getParent());
            }

            ChatMessageSnapshot snapshot = new ChatMessageSnapshot();
            snapshot.setMessages(messages.stream().map(this::cloneMessage).toList());
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(storePath.toFile(), snapshot);
        } catch (IOException exception) {
            log.warn("Unable to persist chat messages to {}: {}", storePath, exception.getMessage());
        }
    }

    private ChatMessage cloneMessage(ChatMessage source) {
        return objectMapper.convertValue(source, ChatMessage.class);
    }
}
