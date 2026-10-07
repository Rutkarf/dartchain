package io.dartchain.backend.quests.model;

import io.dartchain.backend.quests.model.QuestProgressState;

/**
 * Événement interne : un nœud a modifié la progression des quêtes d'un wallet,
 * et veut la répliquer aux autres pairs P2P.
 */
public class QuestProgressP2pChangedEvent {

    private String walletAddress;
    private QuestProgressState state;

    public QuestProgressP2pChangedEvent() {
    }

    public QuestProgressP2pChangedEvent(String walletAddress, QuestProgressState state) {
        this.walletAddress = walletAddress;
        this.state = state;
    }

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

