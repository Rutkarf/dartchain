package io.dartchain.backend.showcase.chat.store;

import io.dartchain.backend.showcase.model.ChatMessage;

import java.util.List;

public interface ChatMessageStore {

    List<ChatMessage> findAll();

    void save(ChatMessage message);

    void replaceAll(List<ChatMessage> messages);
}
