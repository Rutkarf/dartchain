package io.dartchain.backend.support;

import io.dartchain.backend.DartchainBackendApplication;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;

import java.nio.file.Path;
import java.util.UUID;

public final class SecondaryNodeTestSupport {

    private SecondaryNodeTestSupport() {
    }

    public static SecondaryNode start() {
        String suffix = UUID.randomUUID().toString().replace("-", "");
        Path dataDir = Path.of("target", "p2p-node-" + suffix);

        ConfigurableApplicationContext context = new SpringApplicationBuilder(DartchainBackendApplication.class)
                .profiles("default")
                .properties(
                        "server.port=0",
                        "dartchain.persistence.mode=memory",
                        "BLOCKCHAIN_STATE_PATH=" + dataDir.resolve("blockchain-state.json"),
                        "EXCHANGE_LEDGER_PATH=" + dataDir.resolve("exchange-ledger.json"),
                        "LAUNCH_PROJECTS_PATH=" + dataDir.resolve("launch-projects.json"),
                        "CHAT_MESSAGES_PATH=" + dataDir.resolve("chat-messages.json"),
                        "NEWS_ITEMS_PATH=" + dataDir.resolve("news-items.json"),
                        "QUESTS_PROGRESS_PATH=" + dataDir.resolve("quest-progress.json"),
                        "FAUCET_CLAIMS_PATH=" + dataDir.resolve("faucet-claims.json"),
                        "AUTH_USERS_PATH=" + dataDir.resolve("auth-users.json")
                )
                .run();

        Integer port = context.getEnvironment().getProperty("local.server.port", Integer.class, 0);
        return new SecondaryNode(context, port, dataDir);
    }

    public record SecondaryNode(
            ConfigurableApplicationContext context,
            int port,
            Path dataDir
    ) implements AutoCloseable {

        public String baseUrl() {
            return "http://127.0.0.1:" + port;
        }

        public String peerWebSocketUrl() {
            return "ws://127.0.0.1:" + port + "/ws/peers";
        }

        @Override
        public void close() {
            context.close();
        }
    }
}
