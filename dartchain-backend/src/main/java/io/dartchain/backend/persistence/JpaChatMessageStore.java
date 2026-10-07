package io.dartchain.backend.persistence;

import io.dartchain.backend.showcase.chat.store.ChatMessageStore;
import io.dartchain.backend.showcase.model.ChatMessage;
import io.dartchain.backend.persistence.entity.ChatMessageEntity;
import io.dartchain.backend.persistence.repository.ChatMessageJpaRepository;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Component
@ConditionalOnProperty(name = "dartchain.persistence.mode", havingValue = "postgres")
public class JpaChatMessageStore implements ChatMessageStore {

    private final ChatMessageJpaRepository repository;

    public JpaChatMessageStore(ChatMessageJpaRepository repository) {
        this.repository = repository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<ChatMessage> findAll() {
        return repository.findAllByOrderBySentAtAsc().stream()
                .map(this::toModel)
                .toList();
    }

    @Override
    @Transactional
    public void save(ChatMessage message) {
        repository.save(toEntity(message));
    }

    @Override
    @Transactional
    public void replaceAll(List<ChatMessage> messages) {
        repository.deleteAllInBatch();
        if (messages != null && !messages.isEmpty()) {
            repository.saveAll(messages.stream().map(this::toEntity).toList());
        }
    }

    private ChatMessage toModel(ChatMessageEntity entity) {
        return new ChatMessage(
                entity.getId(),
                entity.getRoomId(),
                entity.getAuthor(),
                entity.getMessageText(),
                entity.getSentAt(),
                entity.getClientId(),
                entity.getFontKey(),
                entity.getFontSize(),
                entity.isBold(),
                entity.isItalic(),
                entity.isUnderline(),
                entity.isStrikethrough(),
                entity.getFontColor(),
                entity.getHighlightColor(),
                entity.getTextAlign(),
                entity.getStyleKey()
        );
    }

    private ChatMessageEntity toEntity(ChatMessage message) {
        ChatMessageEntity entity = new ChatMessageEntity();
        entity.setId(message.getId());
        entity.setRoomId(message.getRoomId());
        entity.setAuthor(message.getAuthor());
        entity.setMessageText(message.getText());
        entity.setSentAt(message.getSentAt() != null ? message.getSentAt() : Instant.now());
        entity.setClientId(message.getClientId());
        entity.setFontKey(message.getFontKey());
        entity.setFontSize(message.getFontSize());
        entity.setBold(message.isBold());
        entity.setItalic(message.isItalic());
        entity.setUnderline(message.isUnderline());
        entity.setStrikethrough(message.isStrikethrough());
        entity.setFontColor(message.getFontColor());
        entity.setHighlightColor(message.getHighlightColor());
        entity.setTextAlign(message.getTextAlign());
        entity.setStyleKey(message.getStyleKey());
        return entity;
    }
}
