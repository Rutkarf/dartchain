package io.dartchain.backend.auth.mail;

public interface AuthMailer {

    boolean isConfigured();

    void sendVerificationCode(String to, String username, String code);
}
