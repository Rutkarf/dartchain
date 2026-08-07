package io.dartchain.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "dartchain.oauth")
public class OAuthProperties {

    private boolean devMockEnabled;
    private String frontendCallbackUrl = "http://localhost:4200/";
    private String backendBaseUrl = "http://localhost:8080";
    private Provider google = new Provider();
    private Provider meta = new Provider();
    private AppleProvider apple = new AppleProvider();
    private Provider microsoft = new Provider();
    private Provider github = new Provider();
    private Provider x = new Provider();
    private Provider discord = new Provider();

    public boolean isDevMockEnabled() {
        return devMockEnabled;
    }

    public void setDevMockEnabled(boolean devMockEnabled) {
        this.devMockEnabled = devMockEnabled;
    }

    public String getFrontendCallbackUrl() {
        return frontendCallbackUrl;
    }

    public void setFrontendCallbackUrl(String frontendCallbackUrl) {
        this.frontendCallbackUrl = frontendCallbackUrl;
    }

    public String getBackendBaseUrl() {
        return backendBaseUrl;
    }

    public void setBackendBaseUrl(String backendBaseUrl) {
        this.backendBaseUrl = backendBaseUrl;
    }

    public Provider getGoogle() {
        return google;
    }

    public void setGoogle(Provider google) {
        this.google = google;
    }

    public Provider getMeta() {
        return meta;
    }

    public void setMeta(Provider meta) {
        this.meta = meta;
    }

    public AppleProvider getApple() {
        return apple;
    }

    public void setApple(AppleProvider apple) {
        this.apple = apple;
    }

    public Provider getMicrosoft() {
        return microsoft;
    }

    public void setMicrosoft(Provider microsoft) {
        this.microsoft = microsoft;
    }

    public Provider getGithub() {
        return github;
    }

    public void setGithub(Provider github) {
        this.github = github;
    }

    public Provider getX() {
        return x;
    }

    public void setX(Provider x) {
        this.x = x;
    }

    public Provider getDiscord() {
        return discord;
    }

    public void setDiscord(Provider discord) {
        this.discord = discord;
    }

    public static class Provider {

        private boolean enabled;
        private String clientId = "";
        private String clientSecret = "";

        public boolean isEnabled() {
            return enabled && hasCredentials();
        }

        public boolean isEnabledFlag() {
            return enabled;
        }

        public boolean hasCredentials() {
            return clientId != null
                    && !clientId.isBlank()
                    && clientSecret != null
                    && !clientSecret.isBlank();
        }

        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }

        public String getClientId() {
            return clientId;
        }

        public void setClientId(String clientId) {
            this.clientId = clientId;
        }

        public String getClientSecret() {
            return clientSecret;
        }

        public void setClientSecret(String clientSecret) {
            this.clientSecret = clientSecret;
        }
    }

    public static class AppleProvider {

        private boolean enabled;
        private String clientId = "";
        private String teamId = "";
        private String keyId = "";
        private String privateKey = "";

        public boolean isEnabled() {
            return enabled && hasCredentials();
        }

        public boolean isEnabledFlag() {
            return enabled;
        }

        public boolean hasCredentials() {
            return clientId != null
                    && !clientId.isBlank()
                    && teamId != null
                    && !teamId.isBlank()
                    && keyId != null
                    && !keyId.isBlank()
                    && privateKey != null
                    && !privateKey.isBlank();
        }

        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }

        public String getClientId() {
            return clientId;
        }

        public void setClientId(String clientId) {
            this.clientId = clientId;
        }

        public String getTeamId() {
            return teamId;
        }

        public void setTeamId(String teamId) {
            this.teamId = teamId;
        }

        public String getKeyId() {
            return keyId;
        }

        public void setKeyId(String keyId) {
            this.keyId = keyId;
        }

        public String getPrivateKey() {
            return privateKey;
        }

        public void setPrivateKey(String privateKey) {
            this.privateKey = privateKey;
        }

        public String normalizedPrivateKey() {
            if (privateKey == null) {
                return "";
            }

            return privateKey.replace("\\n", "\n").trim();
        }
    }
}
