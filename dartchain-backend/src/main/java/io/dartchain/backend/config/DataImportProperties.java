package io.dartchain.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "dartchain.data-import")
public class DataImportProperties {

    /**
     * Active l'import one-shot JSON → Postgres (Phase P).
     */
    private boolean enabled = false;

    /**
     * Arrête l'application après import réussi (mode CLI).
     */
    private boolean exitAfterImport = true;

    private String blockchainStatePath = "data/blockchain-state.json";
    private String authUsersPath = "data/auth-users.json";
    private String questProgressPath = "data/quest-progress.json";
    private String faucetClaimsPath = "data/faucet-claims.json";
    private String exchangeLedgerPath = "data/exchange-ledger.json";
    private String launchProjectsPath = "data/launch-projects.json";
    private String chatMessagesPath = "data/chat-messages.json";
    private String newsItemsPath = "data/news-items.json";

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public boolean isExitAfterImport() {
        return exitAfterImport;
    }

    public void setExitAfterImport(boolean exitAfterImport) {
        this.exitAfterImport = exitAfterImport;
    }

    public String getBlockchainStatePath() {
        return blockchainStatePath;
    }

    public void setBlockchainStatePath(String blockchainStatePath) {
        this.blockchainStatePath = blockchainStatePath;
    }

    public String getAuthUsersPath() {
        return authUsersPath;
    }

    public void setAuthUsersPath(String authUsersPath) {
        this.authUsersPath = authUsersPath;
    }

    public String getQuestProgressPath() {
        return questProgressPath;
    }

    public void setQuestProgressPath(String questProgressPath) {
        this.questProgressPath = questProgressPath;
    }

    public String getFaucetClaimsPath() {
        return faucetClaimsPath;
    }

    public void setFaucetClaimsPath(String faucetClaimsPath) {
        this.faucetClaimsPath = faucetClaimsPath;
    }

    public String getExchangeLedgerPath() {
        return exchangeLedgerPath;
    }

    public void setExchangeLedgerPath(String exchangeLedgerPath) {
        this.exchangeLedgerPath = exchangeLedgerPath;
    }

    public String getLaunchProjectsPath() {
        return launchProjectsPath;
    }

    public void setLaunchProjectsPath(String launchProjectsPath) {
        this.launchProjectsPath = launchProjectsPath;
    }

    public String getChatMessagesPath() {
        return chatMessagesPath;
    }

    public void setChatMessagesPath(String chatMessagesPath) {
        this.chatMessagesPath = chatMessagesPath;
    }

    public String getNewsItemsPath() {
        return newsItemsPath;
    }

    public void setNewsItemsPath(String newsItemsPath) {
        this.newsItemsPath = newsItemsPath;
    }
}
