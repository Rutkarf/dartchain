package io.dartchain.backend.p2p;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.dartchain.backend.model.Block;
import io.dartchain.backend.model.PendingTransaction;
import io.dartchain.backend.service.BlockchainService;
import io.dartchain.backend.service.PendingTransactionService;
import io.dartchain.backend.service.TransactionPoolService;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.util.Comparator;
import java.util.List;

@Service
public class P2pService {

    private final ObjectMapper objectMapper;
    private final BlockchainService blockchainService;
    private final PendingTransactionService pendingTransactionService;
    private final TransactionPoolService transactionPoolService;
    private final P2pSessionRegistry sessionRegistry;

    public P2pService(
            ObjectMapper objectMapper,
            BlockchainService blockchainService,
            PendingTransactionService pendingTransactionService,
            TransactionPoolService transactionPoolService,
            P2pSessionRegistry sessionRegistry
    ) {
        this.objectMapper = objectMapper;
        this.blockchainService = blockchainService;
        this.pendingTransactionService = pendingTransactionService;
        this.transactionPoolService = transactionPoolService;
        this.sessionRegistry = sessionRegistry;
    }

    public void onOpen(WebSocketSession session) {
        write(session, queryChainLengthMsg());
        write(session, queryTransactionPoolMsg());
    }

    public void onMessage(WebSocketSession session, String rawMessage) {
        try {
            P2pMessage message = objectMapper.readValue(rawMessage, P2pMessage.class);

            if (message.getType() == null) {
                return;
            }

            switch (message.getType()) {
                case QUERY_LATEST -> write(session, responseLatestMsg());
                case QUERY_ALL -> write(session, responseChainMsg());
                case RESPONSE_BLOCKCHAIN -> handleBlockchainResponse(message.getData());
                case QUERY_TRANSACTION_POOL -> write(session, responseTransactionPoolMsg());
                case RESPONSE_TRANSACTION_POOL -> handleTransactionPoolResponse(message.getData());
            }
        } catch (Exception exception) {
            System.err.println("[P2P] Invalid message: " + exception.getMessage());
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

    private void handleBlockchainResponse(String data) {
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

            if (latestReceivedBlock.getIndex() <= latestHeldBlock.getIndex()) {
                return;
            }

            System.out.println("[P2P] Blockchain possibly behind. Local="
                    + latestHeldBlock.getIndex()
                    + " Remote="
                    + latestReceivedBlock.getIndex());

            if (latestHeldBlock.getHash().equals(latestReceivedBlock.getPreviousHash())) {
                boolean added = blockchainService.addBlockFromPeer(latestReceivedBlock);

                if (added) {
                    System.out.println("[P2P] Added latest block from peer.");
                    broadcastLatest();
                }
            } else if (receivedBlocks.size() == 1) {
                System.out.println("[P2P] Requesting full chain from peers.");
                broadcast(queryAllMsg());
            } else {
                boolean replaced = blockchainService.replaceChainFromPeer(receivedBlocks);

                if (replaced) {
                    System.out.println("[P2P] Replaced local chain with received chain.");
                    broadcastLatest();
                }
            }
        } catch (Exception exception) {
            System.err.println("[P2P] Failed to handle blockchain response: " + exception.getMessage());
        }
    }

    private void handleTransactionPoolResponse(String data) {
        try {
            List<PendingTransaction> receivedTransactions = objectMapper.readValue(
                    data,
                    new TypeReference<List<PendingTransaction>>() {}
            );

            if (receivedTransactions == null || receivedTransactions.isEmpty()) {
                return;
            }

            boolean addedAtLeastOne = false;

            for (PendingTransaction transaction : receivedTransactions) {
                boolean added = pendingTransactionService.addFromPeer(transaction);

                if (added) {
                    addedAtLeastOne = true;
                    System.out.println("[P2P] Added pending transaction from peer: " + transaction.getId());
                }
            }

            if (addedAtLeastOne) {
                broadcastTransactionPool();
            }
        } catch (Exception exception) {
            System.err.println("[P2P] Failed to handle transaction pool response: " + exception.getMessage());
        }
    }

    private void write(WebSocketSession session, P2pMessage message) {
        try {
            if (session != null && session.isOpen()) {
                String payload = objectMapper.writeValueAsString(message);
                session.sendMessage(new TextMessage(payload));
            }
        } catch (Exception exception) {
            System.err.println("[P2P] Failed to send message: " + exception.getMessage());
        }
    }
}