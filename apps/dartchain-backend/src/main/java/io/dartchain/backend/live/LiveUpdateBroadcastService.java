package io.dartchain.backend.live;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.dartchain.backend.dto.PendingTransactionResponse;
import io.dartchain.backend.dto.StatsResponse;
import io.dartchain.backend.model.Block;
import io.dartchain.backend.service.BlockchainService;
import io.dartchain.backend.service.PendingTransactionService;
import io.dartchain.backend.service.PeerService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class LiveUpdateBroadcastService {

    private final LiveUpdateSessionRegistry sessionRegistry;
    private final BlockchainService blockchainService;
    private final PendingTransactionService pendingTransactionService;
    private final PeerService peerService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public LiveUpdateBroadcastService(
            LiveUpdateSessionRegistry sessionRegistry,
            BlockchainService blockchainService,
            PendingTransactionService pendingTransactionService,
            PeerService peerService
    ) {
        this.sessionRegistry = sessionRegistry;
        this.blockchainService = blockchainService;
        this.pendingTransactionService = pendingTransactionService;
        this.peerService = peerService;
    }

    @Scheduled(fixedRate = 5_000)
    public void broadcastSnapshot() {
        for (WebSocketSession session : sessionRegistry.getAll()) {
            sendSnapshot(session);
        }
    }

    public void sendSnapshot(WebSocketSession session) {
        if (session == null || !session.isOpen()) {
            return;
        }

        try {
            String payload = objectMapper.writeValueAsString(buildSnapshotMessage());
            session.sendMessage(new TextMessage(payload));
        } catch (Exception exception) {
            // Session will be cleaned up on transport error.
        }
    }

    private Map<String, Object> buildSnapshotMessage() {
        StatsResponse stats = blockchainService.getStats();
        List<Block> blocks = blockchainService.getBlocks();
        List<PendingTransactionResponse> pendingTransactions =
                pendingTransactionService.getPendingTransactions();

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("stats", stats);
        data.put("blocks", blocks);
        data.put("pendingTransactions", pendingTransactions);
        data.put("peers", peerService.getPeers());

        Map<String, Object> message = new LinkedHashMap<>();
        message.put("type", "snapshot");
        message.put("data", data);
        return message;
    }
}
