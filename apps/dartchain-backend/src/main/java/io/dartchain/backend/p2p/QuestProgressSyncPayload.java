package io.dartchain.backend.p2p;

import io.dartchain.backend.quests.model.QuestProgressState;

/**
 * Payload P2P pour synchroniser l'état de progression des quêtes (off-chain).
 *
 * Important : on ne déclenche aucun mint on-chain ici. On fusionne uniquement le state côté serveur
 * pour rendre `/api/quests/state` cohérent entre nœuds.
 */
public class QuestProgressSyncPayload {

    private String walletAddress;
    private QuestProgressState state;

    public String getWalletAddress() {
        return walletAddress;
    }

    public void setWalletAddress(String walletAddress) {
        this.walletAddress = walletAddress;
    }

    public QuestProgressState getState() {
        return state;
    }

    public void setState(QuestProgressState state) {
        this.state = state;
    }
}

