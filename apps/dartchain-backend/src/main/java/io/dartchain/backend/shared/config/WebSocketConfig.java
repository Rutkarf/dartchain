package io.dartchain.backend.shared.config;

import io.dartchain.backend.auth.security.WebSocketAuthHandshakeInterceptor;
import io.dartchain.backend.live.LiveSocketHandler;
import io.dartchain.backend.metaverse.arena.ws.ArenaSocketHandler;
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
    private final ArenaSocketHandler arenaSocketHandler;
    private final WebSocketAuthHandshakeInterceptor webSocketAuthHandshakeInterceptor;

    public WebSocketConfig(
            PeerSocketHandler peerSocketHandler,
            LiveSocketHandler liveSocketHandler,
            ChatSocketHandler chatSocketHandler,
            ArenaSocketHandler arenaSocketHandler,
            WebSocketAuthHandshakeInterceptor webSocketAuthHandshakeInterceptor
    ) {
        this.peerSocketHandler = peerSocketHandler;
        this.liveSocketHandler = liveSocketHandler;
        this.chatSocketHandler = chatSocketHandler;
        this.arenaSocketHandler = arenaSocketHandler;
        this.webSocketAuthHandshakeInterceptor = webSocketAuthHandshakeInterceptor;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        String[] allowedOrigins = CorsConfig.ALLOWED_ORIGIN_PATTERNS.toArray(String[]::new);

        registry.addHandler(peerSocketHandler, "/ws/peers")
                .addInterceptors(webSocketAuthHandshakeInterceptor)
                .setAllowedOriginPatterns(allowedOrigins);

        registry.addHandler(liveSocketHandler, "/ws/live")
                .addInterceptors(webSocketAuthHandshakeInterceptor)
                .setAllowedOriginPatterns(allowedOrigins);

        registry.addHandler(chatSocketHandler, "/ws/chat")
                .addInterceptors(webSocketAuthHandshakeInterceptor)
                .setAllowedOriginPatterns(allowedOrigins);

        // Q2=B — canal dédié arène (additif, ne remplace pas live/chat/peers).
        registry.addHandler(arenaSocketHandler, "/ws/metaverse-arena")
                .addInterceptors(webSocketAuthHandshakeInterceptor)
                .setAllowedOriginPatterns(allowedOrigins);
    }
}
