package io.dartchain.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Phase Z — configuration produit commercial vs pédagogique.
 * Les flags restreignent les raccourcis pédagogiques ; l'API legacy non versionnée est dépréciée.
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
     * Réservé compatibilité config — le faucet reste toujours actif (dev et prod).
     */
    @SuppressWarnings("unused")
    private boolean faucetEnabled = true;

    /**
     * Active le module showcase (news, chat, launch…).
     */
    private boolean showcaseEnabled = true;

    /**
     * Politique prod : indique si des alias legacy {@code /api/*} top-level étaient autorisés.
     * Exposé dans health v1 — les alias retirés (ex. {@code /api/stats}) ne sont pas ré-enregistrés.
     */
    private boolean legacyApiAliasesEnabled = false;

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
        return true;
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
