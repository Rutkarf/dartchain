package io.dartchain.backend.showcase.chat;

import io.dartchain.backend.showcase.model.ChatMessage;

import java.util.List;

public class ChatMessageSnapshot {

    private List<ChatMessage> messages = List.of();

    public ChatMessageSnapshot() {
    }

    public List<ChatMessage> getMessages() {
        return messages;
    }

    public void setMessages(List<ChatMessage> messages) {
        this.messages = messages != null ? messages : List.of();
    }
}
