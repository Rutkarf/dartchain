package io.dartchain.backend.showcase.service;

import io.dartchain.backend.showcase.chat.JsonChatMessageStore;
import io.dartchain.backend.showcase.dto.ChatMessageRequest;
import io.dartchain.backend.showcase.dto.ChatMessageResponse;
import io.dartchain.backend.support.TestObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Path;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ChatServiceTest {

    @TempDir
    Path tempDir;

    private ChatService chatService;

    @BeforeEach
    void setUp() {
        chatService = new ChatService(new JsonChatMessageStore(
                TestObjectMapper.create(),
                tempDir.resolve("chat-messages.json").toString()
        ));
        chatService.loadMessages();
    }

    @Test
    void postMessage_storesAndReturnsMessage() {
        ChatMessageResponse response = chatService.postMessage(
                new ChatMessageRequest(
                        "Alice",
                        "Hello DART",
                        "client-1",
                        null,
                        "arial",
                        "14",
                        true,
                        false,
                        true,
                        false,
                        "#ff4d6d",
                        "transparent",
                        "center",
                        "neon",
                        null
                )
        );

        assertThat(response.author()).isEqualTo("Alice");
        assertThat(response.text()).isEqualTo("Hello DART");
        assertThat(response.bold()).isTrue();
        assertThat(response.fontSize()).isEqualTo("14");
        assertThat(response.fontColor()).isEqualTo("#ff4d6d");
    }

    @Test
    void getRecentMessages_returnsPostedMessages() {
        chatService.postMessage(new ChatMessageRequest(
                "Bob", "Hi", null, null,
                null, null, null, null, null, null,
                null, null, null, null, null
        ));

        List<ChatMessageResponse> messages = chatService.getRecentMessages(null, 10);

        assertThat(messages).hasSize(1);
        assertThat(messages.get(0).author()).isEqualTo("Bob");
    }

    @Test
    void postMessage_rejectsEmptyText() {
        assertThatThrownBy(() ->
                chatService.postMessage(new ChatMessageRequest(
                        "Alice", "  ", null, null,
                        null, null, null, null, null, null,
                        null, null, null, null, null
                ))
        ).isInstanceOf(IllegalArgumentException.class);
    }
}
