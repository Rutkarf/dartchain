package io.dartchain.backend.config;

import io.dartchain.backend.live.LiveSocketHandler;
import io.dartchain.backend.p2p.PeerSocketHandler;
import io.dartchain.backend.showcase.chat.ChatSocketHandler;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final PeerSocketHandler peerSocketHandler;
    private final LiveSocketHandler liveSocketHandler;
    private final ChatSocketHandler chatSocketHandler;

    public WebSocketConfig(
            PeerSocketHandler peerSocketHandler,
            LiveSocketHandler liveSocketHandler,
            ChatSocketHandler chatSocketHandler
    ) {
        this.peerSocketHandler = peerSocketHandler;
        this.liveSocketHandler = liveSocketHandler;
        this.chatSocketHandler = chatSocketHandler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(peerSocketHandler, "/ws/peers")
                .setAllowedOriginPatterns("*");

        registry.addHandler(liveSocketHandler, "/ws/live")
                .setAllowedOriginPatterns("*");

        registry.addHandler(chatSocketHandler, "/ws/chat")
                .setAllowedOriginPatterns("*");
    }
}