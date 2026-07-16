package io.dartchain.backend.p2p;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.dartchain.backend.auth.security.WebSocketAuthSupport;
import io.dartchain.backend.model.Block;
import io.dartchain.backend.model.PendingTransaction;
import io.dartchain.backend.peer.PeerMetricsRegistry;
import io.dartchain.backend.service.BlockchainService;
import io.dartchain.backend.service.PendingTransactionService;
import io.dartchain.backend.service.TransactionPoolService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.util.Comparator;
import java.util.List;

@Service
public class P2pService {

    private static final Logger log = LoggerFactory.getLogger(P2pService.class);

    private final ObjectMapper objectMapper;
    private final BlockchainService blockchainService;
    private final PendingTransactionService pendingTransactionService;
    private final TransactionPoolService transactionPoolService;
    private final P2pSessionRegistry sessionRegistry;
    private final WebSocketAuthSupport webSocketAuthSupport;
    private final PeerMetricsRegistry metricsRegistry;

    public P2pService(
            ObjectMapper objectMapper,
            BlockchainService blockchainService,
            PendingTransactionService pendingTransactionService,
            TransactionPoolService transactionPoolService,
            P2pSessionRegistry sessionRegistry,
            WebSocketAuthSupport webSocketAuthSupport,
            PeerMetricsRegistry metricsRegistry
    ) {
        this.objectMapper = objectMapper;
        this.blockchainService = blockchainService;
        this.pendingTransactionService = pendingTransactionService;
        this.transactionPoolService = transactionPoolService;
        this.sessionRegistry = sessionRegistry;
        this.webSocketAuthSupport = webSocketAuthSupport;
        this.metricsRegistry = metricsRegistry;
    }

    public void onOpen(WebSocketSession session) {
        write(session, queryChainLengthMsg());
        write(session, queryTransactionPoolMsg());
    }

    public void onMessage(WebSocketSession session, String rawMessage) {
        metricsRegistry.recordActivity(session);

        try {
            P2pMessage message = objectMapper.readValue(rawMessage, P2pMessage.class);

            if (message.getType() == null) {
                return;
            }

            if (requiresAuthentication(message.getType())
                    && webSocketAuthSupport.resolveFromSession(session).isEmpty()) {
                log.debug("[P2P] Ignoring authenticated message type {} without session auth", message.getType());
                return;
            }

            switch (message.getType()) {
                case QUERY_LATEST -> write(session, responseLatestMsg());
                case QUERY_ALL -> write(session, responseChainMsg());
                case RESPONSE_BLOCKCHAIN -> handleBlockchainResponse(session, message.getData());
                case QUERY_TRANSACTION_POOL -> write(session, responseTransactionPoolMsg());
                case RESPONSE_TRANSACTION_POOL -> handleTransactionPoolResponse(session, message.getData());
            }
        } catch (Exception exception) {
            log.warn("[P2P] Invalid message: {}", exception.getMessage());
        }
    }

    public void broadcastLatest() {
        broadcast(responseLatestMsg());
    }

    public void broadcastTransactionPool() {
        broadcast(responseTransactionPoolMsg());
    }

    public void broadcast(P2pMessage message) {
        for (WebSocketSession session : sessionRegistry.getAll()) {
            write(session, message);
        }
    }

    public P2pMessage queryChainLengthMsg() {
        return new P2pMessage(P2pMessageType.QUERY_LATEST, null);
    }

    public P2pMessage queryAllMsg() {
        return new P2pMessage(P2pMessageType.QUERY_ALL, null);
    }

    public P2pMessage queryTransactionPoolMsg() {
        return new P2pMessage(P2pMessageType.QUERY_TRANSACTION_POOL, null);
    }

    public P2pMessage responseChainMsg() {
        try {
            String data = objectMapper.writeValueAsString(blockchainService.getBlocks());
            return new P2pMessage(P2pMessageType.RESPONSE_BLOCKCHAIN, data);
        } catch (Exception exception) {
            throw new IllegalStateException("Unable to serialize blockchain", exception);
        }
    }

    public P2pMessage responseLatestMsg() {
        try {
            String data = objectMapper.writeValueAsString(
                    List.of(blockchainService.getLatestBlock())
            );
            return new P2pMessage(P2pMessageType.RESPONSE_BLOCKCHAIN, data);
        } catch (Exception exception) {
            throw new IllegalStateException("Unable to serialize latest block", exception);
        }
    }

    public P2pMessage responseTransactionPoolMsg() {
        try {
            String data = objectMapper.writeValueAsString(transactionPoolService.getAll());
            return new P2pMessage(P2pMessageType.RESPONSE_TRANSACTION_POOL, data);
        } catch (Exception exception) {
            throw new IllegalStateException("Unable to serialize transaction pool", exception);
        }
    }

    private void handleBlockchainResponse(WebSocketSession session, String data) {
        try {
            List<Block> receivedBlocks = objectMapper.readValue(
                    data,
                    new TypeReference<List<Block>>() {}
            );

            if (receivedBlocks == null || receivedBlocks.isEmpty()) {
                return;
            }

            receivedBlocks.sort(Comparator.comparingInt(Block::getIndex));

            Block latestReceivedBlock = receivedBlocks.get(receivedBlocks.size() - 1);
            Block latestHeldBlock = blockchainService.getLatestBlock();
            int localHeight = blockchainService.getBlocks().size();
            int remoteHeight = receivedBlocks.size();
            String peerKey = metricsRegistry.resolvePeerKey(session);

            metricsRegistry.recordChainSync(peerKey, remoteHeight, localHeight);

            if (latestReceivedBlock.getIndex() <= latestHeldBlock.getIndex()) {
                return;
            }

            log.info(
                    "[P2P] Blockchain possibly behind. peer={} local={} remote={}",
                    peerKey,
                    latestHeldBlock.getIndex(),
                    latestReceivedBlock.getIndex()
            );

            if (latestHeldBlock.getHash().equals(latestReceivedBlock.getPreviousHash())) {
                boolean added = blockchainService.addBlockFromPeer(latestReceivedBlock);

                if (added) {
                    log.info("[P2P] Added latest block from peer {}", peerKey);
                    metricsRegistry.recordChainSync(
                            peerKey,
                            remoteHeight,
                            blockchainService.getBlocks().size()
                    );
                    broadcastLatest();
                }
            } else if (receivedBlocks.size() == 1) {
                log.info("[P2P] Requesting full chain from peers (peer={})", peerKey);
                broadcast(queryAllMsg());
            } else {
                boolean replaced = blockchainService.replaceChainFromPeer(receivedBlocks);

                if (replaced) {
                    log.info("[P2P] Replaced local chain with received chain (peer={})", peerKey);
                    metricsRegistry.recordChainSync(
                            peerKey,
                            remoteHeight,
                            blockchainService.getBlocks().size()
                    );
                    broadcastLatest();
                }
            }
        } catch (Exception exception) {
            log.warn("[P2P] Failed to handle blockchain response: {}", exception.getMessage());
        }
    }

    private void handleTransactionPoolResponse(WebSocketSession session, String data) {
        try {
            List<PendingTransaction> receivedTransactions = objectMapper.readValue(
                    data,
                    new TypeReference<List<PendingTransaction>>() {}
            );

            if (receivedTransactions == null || receivedTransactions.isEmpty()) {
                return;
            }

            boolean addedAtLeastOne = false;
            String peerKey = metricsRegistry.resolvePeerKey(session);

            for (PendingTransaction transaction : receivedTransactions) {
                boolean added = pendingTransactionService.addFromPeer(transaction);

                if (added) {
                    addedAtLeastOne = true;
                    log.info("[P2P] Added pending transaction from peer {}: {}", peerKey, transaction.getId());
                }
            }

            if (addedAtLeastOne) {
                broadcastTransactionPool();
            }
        } catch (Exception exception) {
            log.warn("[P2P] Failed to handle transaction pool response: {}", exception.getMessage());
        }
    }

    private void write(WebSocketSession session, P2pMessage message) {
        try {
            if (session != null && session.isOpen()) {
                String payload = objectMapper.writeValueAsString(message);
                session.sendMessage(new TextMessage(payload));
                metricsRegistry.recordActivity(session);
            }
        } catch (Exception exception) {
            log.warn("[P2P] Failed to send message: {}", exception.getMessage());
        }
    }

    private boolean requiresAuthentication(P2pMessageType type) {
        return type == P2pMessageType.RESPONSE_BLOCKCHAIN
                || type == P2pMessageType.RESPONSE_TRANSACTION_POOL;
    }
}
