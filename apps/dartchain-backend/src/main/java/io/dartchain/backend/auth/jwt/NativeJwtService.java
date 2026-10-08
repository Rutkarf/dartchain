package io.dartchain.backend.auth.jwt;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.dartchain.backend.auth.application.AuthException;
import io.dartchain.backend.auth.model.UserRole;
import io.dartchain.backend.config.AuthProperties;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;
import java.util.Optional;
import java.util.UUID;

/**
 * Phase AB — JWT HS256 natif (JDK uniquement, sans lib tierce).
 */
@Service
public class NativeJwtService {

    private static final Base64.Encoder URL_ENCODER = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder URL_DECODER = Base64.getUrlDecoder();
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final AuthProperties authProperties;

    public NativeJwtService(AuthProperties authProperties) {
        this.authProperties = authProperties;
    }

    public String createAccessToken(String userId, UserRole role) {
        long now = Instant.now().getEpochSecond();
        long exp = now + authProperties.getAccessTokenTtlSeconds();
        return signToken("""
                {"sub":"%s","role":"%s","purpose":"access","iat":%d,"exp":%d,"jti":"%s"}
                """.formatted(userId, role.name(), now, exp, UUID.randomUUID()));
    }

    public String createChallengeToken(String userId, String purpose, long ttlSeconds) {
        long now = Instant.now().getEpochSecond();
        long exp = now + Math.max(30, ttlSeconds);
        return signToken("""
                {"sub":"%s","purpose":"%s","iat":%d,"exp":%d,"jti":"%s"}
                """.formatted(userId, purpose, now, exp, UUID.randomUUID()));
    }

    public Optional<String> parseChallenge(String token, String purpose) {
        JsonNode payload = readVerifiedPayload(token);
        if (payload == null) {
            return Optional.empty();
        }
        if (!purpose.equals(payload.path("purpose").asText(""))) {
            return Optional.empty();
        }
        String subject = payload.path("sub").asText("");
        if (subject.isBlank()) {
            return Optional.empty();
        }
        return Optional.of(subject);
    }

    private String signToken(String payloadJson) {
        String header = encodeJson("""
                {"alg":"HS256","typ":"JWT"}
                """);
        String payload = encodeJson(payloadJson);
        String signature = sign(header + "." + payload);
        return header + "." + payload + "." + signature;
    }

    public Optional<JwtClaims> parseAndValidate(String token) {
        if (token == null || token.isBlank()) {
            return Optional.empty();
        }

        JsonNode payload = readVerifiedPayload(token);
        if (payload == null) {
            return Optional.empty();
        }
        String purpose = payload.path("purpose").asText("");
        if (!purpose.isEmpty() && !"access".equals(purpose)) {
            return Optional.empty();
        }

        return Optional.of(new JwtClaims(
                payload.path("sub").asText(""),
                payload.path("role").asText(UserRole.USER.name()),
                payload.path("iat").asLong(0),
                payload.path("exp").asLong(0),
                payload.path("jti").asText("")
        ));
    }

    private JsonNode readVerifiedPayload(String token) {
        if (token == null || token.isBlank()) {
            return null;
        }

        String[] parts = token.trim().split("\\.");
        if (parts.length != 3) {
            return null;
        }

        String expectedSignature = sign(parts[0] + "." + parts[1]);
        if (!MessageDigest.isEqual(
                expectedSignature.getBytes(StandardCharsets.UTF_8),
                parts[2].getBytes(StandardCharsets.UTF_8)
        )) {
            return null;
        }

        try {
            JsonNode payload = MAPPER.readTree(URL_DECODER.decode(parts[1]));
            long exp = payload.path("exp").asLong(0);
            if (exp <= Instant.now().getEpochSecond()) {
                return null;
            }
            return payload;
        } catch (Exception exception) {
            return null;
        }
    }

    public long accessTokenTtlSeconds() {
        return authProperties.getAccessTokenTtlSeconds();
    }

    public void requireConfiguredSecret() {
        String secret = authProperties.getJwtSecret();
        if (secret == null || secret.isBlank() || "dev-only-change-in-prod".equals(secret)) {
            return;
        }
    }

    private String sign(String content) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(resolveSecretBytes(), "HmacSHA256"));
            byte[] digest = mac.doFinal(content.getBytes(StandardCharsets.UTF_8));
            return URL_ENCODER.encodeToString(digest);
        } catch (Exception exception) {
            throw new AuthException(500, "Impossible de signer le jeton JWT");
        }
    }

    private byte[] resolveSecretBytes() {
        String secret = authProperties.getJwtSecret();
        if (secret == null || secret.isBlank()) {
            throw new AuthException(500, "dartchain.auth.jwt-secret non configuré");
        }
        return secret.getBytes(StandardCharsets.UTF_8);
    }

    private String encodeJson(String json) {
        return URL_ENCODER.encodeToString(json.replaceAll("\\s+", "").getBytes(StandardCharsets.UTF_8));
    }
}
