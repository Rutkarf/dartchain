package io.dartchain.backend.auth.oauth;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
record GoogleTokenResponse(
        @JsonProperty("access_token") String accessToken,
        @JsonProperty("id_token") String idToken,
        @JsonProperty("token_type") String tokenType,
        @JsonProperty("expires_in") Long expiresIn
) {
}

@JsonIgnoreProperties(ignoreUnknown = true)
record GoogleUserInfo(
        String sub,
        String email,
        String name,
        @JsonProperty("email_verified") Boolean emailVerified
) {
}

@JsonIgnoreProperties(ignoreUnknown = true)
record MetaTokenResponse(
        @JsonProperty("access_token") String accessToken,
        @JsonProperty("token_type") String tokenType,
        @JsonProperty("expires_in") Long expiresIn
) {
}

@JsonIgnoreProperties(ignoreUnknown = true)
record MetaUserInfo(
        String id,
        String email,
        String name
) {
}

@JsonIgnoreProperties(ignoreUnknown = true)
record StandardTokenResponse(
        @JsonProperty("access_token") String accessToken,
        @JsonProperty("token_type") String tokenType,
        @JsonProperty("expires_in") Long expiresIn,
        @JsonProperty("refresh_token") String refreshToken,
        @JsonProperty("scope") String scope
) {
}

@JsonIgnoreProperties(ignoreUnknown = true)
record MicrosoftUserInfo(
        String id,
        String mail,
        @JsonProperty("userPrincipalName") String userPrincipalName,
        @JsonProperty("displayName") String displayName
) {
}

@JsonIgnoreProperties(ignoreUnknown = true)
record GitHubUserInfo(
        String id,
        String login,
        String email,
        String name
) {
}

@JsonIgnoreProperties(ignoreUnknown = true)
record GitHubEmailInfo(
        String email,
        boolean primary,
        boolean verified
) {
}

@JsonIgnoreProperties(ignoreUnknown = true)
record DiscordUserInfo(
        String id,
        String username,
        String email,
        @JsonProperty("global_name") String globalName
) {
}

@JsonIgnoreProperties(ignoreUnknown = true)
record XUserResponse(
        XUserData data
) {
}

@JsonIgnoreProperties(ignoreUnknown = true)
record XUserData(
        String id,
        String name,
        String username
) {
}

record AppleTokenResponse(
        @JsonProperty("access_token") String accessToken,
        @JsonProperty("id_token") String idToken,
        @JsonProperty("token_type") String tokenType,
        @JsonProperty("expires_in") Long expiresIn
) {
}

@JsonIgnoreProperties(ignoreUnknown = true)
record AppleIdTokenClaims(
        String sub,
        String email
) {
}
