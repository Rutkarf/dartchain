package io.dartchain.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Phase Z — configuration produit commercial vs pédagogique.
 * Les flags désactivent les chemins legacy sans supprimer le code.
 */
@ConfigurationProperties(prefix = "dartchain.product")
public class ProductProperties {

    /**
     * Mode commercial : exige Postgres et interdit les raccourcis pédagogiques en prod.
     */
    private boolean commercial = false;

    /**
     * Accepte {@code senderPrivateKey} dans le corps des requêtes transaction.
     */
    private boolean allowLegacyPrivateKey = true;

    /**
     * Autorise {@code POST /api/wallets/create} (clé privée générée côté serveur).
     */
    private boolean allowServerWalletCreate = true;

    /**
     * Active le faucet (tokens gratuits).
     */
    private boolean faucetEnabled = true;

    /**
     * Active le module showcase (news, chat, launch…).
     */
    private boolean showcaseEnabled = true;

    /**
     * Expose les alias API legacy ({@code /api/stats}, etc.).
     */
    private boolean legacyApiAliasesEnabled = true;

    public boolean isCommercial() {
        return commercial;
    }

    public void setCommercial(boolean commercial) {
        this.commercial = commercial;
    }

    public boolean isAllowLegacyPrivateKey() {
        return allowLegacyPrivateKey;
    }

    public void setAllowLegacyPrivateKey(boolean allowLegacyPrivateKey) {
        this.allowLegacyPrivateKey = allowLegacyPrivateKey;
    }

    public boolean isAllowServerWalletCreate() {
        return allowServerWalletCreate;
    }

    public void setAllowServerWalletCreate(boolean allowServerWalletCreate) {
        this.allowServerWalletCreate = allowServerWalletCreate;
    }

    public boolean isFaucetEnabled() {
        return faucetEnabled;
    }

    public void setFaucetEnabled(boolean faucetEnabled) {
        this.faucetEnabled = faucetEnabled;
    }

    public boolean isShowcaseEnabled() {
        return showcaseEnabled;
    }

    public void setShowcaseEnabled(boolean showcaseEnabled) {
        this.showcaseEnabled = showcaseEnabled;
    }

    public boolean isLegacyApiAliasesEnabled() {
        return legacyApiAliasesEnabled;
    }

    public void setLegacyApiAliasesEnabled(boolean legacyApiAliasesEnabled) {
        this.legacyApiAliasesEnabled = legacyApiAliasesEnabled;
    }
}
