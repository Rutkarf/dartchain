package io.dartchain.backend.p2p;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.dartchain.backend.quests.model.QuestProgressP2pChangedEvent;
import io.dartchain.backend.quests.model.QuestProgressState;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
public class QuestProgressP2pChangedListener {

    private final P2pService p2pService;
    private final ObjectMapper objectMapper;

    public QuestProgressP2pChangedListener(P2pService p2pService, ObjectMapper objectMapper) {
        this.p2pService = p2pService;
        this.objectMapper = objectMapper;
    }

    @EventListener
    public void onQuestProgressChanged(QuestProgressP2pChangedEvent event) {
        if (event == null) {
            return;
        }

        String walletAddress = event.getWalletAddress();
        QuestProgressState state = event.getState();
        if (walletAddress == null || walletAddress.isBlank() || state == null) {
            return;
        }

        try {
            QuestProgressSyncPayload payload = new QuestProgressSyncPayload();
            payload.setWalletAddress(walletAddress);
            payload.setState(state);

            String raw = objectMapper.writeValueAsString(payload);
            p2pService.broadcast(
                    new P2pMessage(P2pMessageType.RESPONSE_QUEST_PROGRESS, raw)
            );
        } catch (Exception ignored) {
            // Ne pas casser les flows métier (quest, wallet, auth…).
        }
    }
}

