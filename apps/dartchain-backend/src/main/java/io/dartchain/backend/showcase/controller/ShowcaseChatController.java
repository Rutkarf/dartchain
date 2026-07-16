package io.dartchain.backend.showcase.controller;

import io.dartchain.backend.auth.security.AuthenticatedUser;
import io.dartchain.backend.showcase.dto.ChatHistoryResponse;
import io.dartchain.backend.showcase.dto.ChatMessageRequest;
import io.dartchain.backend.showcase.dto.ChatMessageResponse;
import io.dartchain.backend.showcase.service.ChatService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/showcase/chat")
public class ShowcaseChatController {

    private final ChatService chatService;

    public ShowcaseChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    @GetMapping("/messages")
    public ChatHistoryResponse getMessages(
            @RequestParam(required = false) String roomId,
            @RequestParam(defaultValue = "50") int limit
    ) {
        String room = roomId != null && !roomId.isBlank() ? roomId : ChatService.DEFAULT_ROOM;

        return new ChatHistoryResponse(
                room,
                chatService.getRecentMessages(room, limit)
        );
    }

    @PostMapping("/messages")
    @ResponseStatus(HttpStatus.CREATED)
    public ChatMessageResponse postMessage(
            @Valid @RequestBody ChatMessageRequest request,
            @AuthenticationPrincipal AuthenticatedUser user
    ) {
        return chatService.postMessage(request, user.getUsername());
    }
}
