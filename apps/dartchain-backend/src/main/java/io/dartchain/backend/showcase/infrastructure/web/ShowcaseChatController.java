package io.dartchain.backend.showcase.infrastructure.web;

import io.dartchain.backend.auth.security.AuthenticatedUser;
import io.dartchain.backend.auth.security.RoleAuthorizationService;
import io.dartchain.backend.showcase.chat.ChatSocketHandler;
import io.dartchain.backend.web.RequestClientInfo;
import jakarta.servlet.http.HttpServletRequest;
import io.dartchain.backend.showcase.dto.ChatHistoryResponse;
import io.dartchain.backend.showcase.dto.ChatMessageRequest;
import io.dartchain.backend.showcase.dto.ChatMessageResponse;
import io.dartchain.backend.showcase.application.ChatService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/showcase/chat")
public class ShowcaseChatController {

    private final ChatService chatService;
    private final ChatSocketHandler chatSocketHandler;
    private final RoleAuthorizationService roleAuthorizationService;

    public ShowcaseChatController(
            ChatService chatService,
            ChatSocketHandler chatSocketHandler,
            RoleAuthorizationService roleAuthorizationService
    ) {
        this.chatService = chatService;
        this.chatSocketHandler = chatSocketHandler;
        this.roleAuthorizationService = roleAuthorizationService;
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
        if (user != null && !ChatService.wantsAnonymousPost(request)) {
            return chatService.postMessage(request, user.getUsername());
        }
        // Posts anonymes (sans compte, ou mode Anonymous explicite)
        return chatService.postMessage(request, ChatService.ANONYMOUS_AUTHOR);
    }

    @DeleteMapping("/messages")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void clearMessages(
            @RequestParam(required = false) String roomId,
            @RequestHeader(value = "Authorization", required = false) String authorization,
            HttpServletRequest httpRequest
    ) throws Exception {
        roleAuthorizationService.requireAdmin(authorization, RequestClientInfo.clientIp(httpRequest));
        String resolvedRoom = chatService.clearRoom(roomId);
        chatSocketHandler.broadcastClear(resolvedRoom);
    }
}
