package io.dartchain.backend.auth.security;

import io.dartchain.backend.auth.application.AuthException;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Instant;

/**
 * TOTP RFC 6238, HMAC-SHA1, 6 chiffres, fenêtre de 30 secondes.
 */
public final class TotpAuthenticator {

    private static final int DIGITS = 6;
    private static final int PERIOD_SECONDS = 30;
    private static final int SECRET_BYTES = 20;
    private static final String BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    private static final SecureRandom RANDOM = new SecureRandom();

    private TotpAuthenticator() {
    }

    public static String generateSecret() {
        byte[] raw = new byte[SECRET_BYTES];
        RANDOM.nextBytes(raw);
        return encodeBase32(raw);
    }

    public static String otpauthUrl(String email, String secret) {
        String account = URLEncoder.encode(email == null ? "user" : email, StandardCharsets.UTF_8);
        return "otpauth://totp/Dartchain:" + account
                + "?secret=" + secret
                + "&issuer=Dartchain&algorithm=SHA1&digits=6&period=30";
    }

    public static boolean matches(String secret, String code) {
        String normalized = digitsOnly(code);
        if (normalized.length() != DIGITS || secret == null || secret.isBlank()) {
            return false;
        }
        byte[] key;
        try {
            key = decodeBase32(secret);
        } catch (IllegalArgumentException exception) {
            return false;
        }
        long now = Instant.now().getEpochSecond();
        for (int skew = -1; skew <= 1; skew++) {
            String expected = codeAt(key, now + (skew * PERIOD_SECONDS), DIGITS);
            if (constantTimeEquals(expected, normalized)) {
                return true;
            }
        }
        return false;
    }

    public static String currentCode(String secret) {
        return codeAt(decodeBase32(secret), Instant.now().getEpochSecond(), DIGITS);
    }

    static String codeAt(byte[] key, long epochSeconds, int digits) {
        long counter = Math.floorDiv(epochSeconds, PERIOD_SECONDS);
        byte[] data = new byte[8];
        for (int i = 7; i >= 0; i--) {
            data[i] = (byte) (counter & 0xff);
            counter >>= 8;
        }
        try {
            Mac mac = Mac.getInstance("HmacSHA1");
            mac.init(new SecretKeySpec(key, "HmacSHA1"));
            byte[] hash = mac.doFinal(data);
            int offset = hash[hash.length - 1] & 0x0f;
            int binary = ((hash[offset] & 0x7f) << 24)
                    | ((hash[offset + 1] & 0xff) << 16)
                    | ((hash[offset + 2] & 0xff) << 8)
                    | (hash[offset + 3] & 0xff);
            int modulo = 1;
            for (int i = 0; i < digits; i++) {
                modulo *= 10;
            }
            String raw = Integer.toString(binary % modulo);
            return "0".repeat(Math.max(0, digits - raw.length())) + raw;
        } catch (Exception exception) {
            throw new AuthException(500, "Impossible de calculer le code TOTP");
        }
    }

    private static String digitsOnly(String code) {
        if (code == null) {
            return "";
        }
        StringBuilder digits = new StringBuilder(code.length());
        for (int i = 0; i < code.length(); i++) {
            char character = code.charAt(i);
            if (character >= '0' && character <= '9') {
                digits.append(character);
            }
        }
        return digits.toString();
    }

    private static boolean constantTimeEquals(String left, String right) {
        if (left == null || right == null || left.length() != right.length()) {
            return false;
        }
        int diff = 0;
        for (int i = 0; i < left.length(); i++) {
            diff |= left.charAt(i) ^ right.charAt(i);
        }
        return diff == 0;
    }

    static String encodeBase32(byte[] data) {
        StringBuilder out = new StringBuilder((data.length * 8 + 4) / 5);
        int buffer = 0;
        int bits = 0;
        for (byte value : data) {
            buffer = (buffer << 8) | (value & 0xff);
            bits += 8;
            while (bits >= 5) {
                bits -= 5;
                out.append(BASE32.charAt((buffer >> bits) & 0x1f));
            }
        }
        if (bits > 0) {
            out.append(BASE32.charAt((buffer << (5 - bits)) & 0x1f));
        }
        return out.toString();
    }

    static byte[] decodeBase32(String secret) {
        String cleaned = secret.trim().replace(" ", "").replace("=", "").toUpperCase();
        if (cleaned.isEmpty()) {
            throw new IllegalArgumentException("secret vide");
        }
        int buffer = 0;
        int bits = 0;
        byte[] out = new byte[cleaned.length() * 5 / 8];
        int index = 0;
        for (int i = 0; i < cleaned.length(); i++) {
            int value = BASE32.indexOf(cleaned.charAt(i));
            if (value < 0) {
                throw new IllegalArgumentException("secret base32 invalide");
            }
            buffer = (buffer << 5) | value;
            bits += 5;
            if (bits >= 8) {
                bits -= 8;
                out[index++] = (byte) ((buffer >> bits) & 0xff);
            }
        }
        if (index == out.length) {
            return out;
        }
        byte[] trimmed = new byte[index];
        System.arraycopy(out, 0, trimmed, 0, index);
        return trimmed;
    }
}
