package io.dartchain.backend.auth.bootstrap;

import io.dartchain.backend.auth.application.PasswordHasher;
import io.dartchain.backend.auth.model.UserAccount;
import io.dartchain.backend.auth.model.UserRole;
import io.dartchain.backend.auth.store.UserAccountStore;
import io.dartchain.backend.config.AuthProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.UUID;

/**
 * Crée / synchronise le compte admin bootstrap (dev) : username + password configurés.
 */
@Component
@Order(20)
public class BootstrapAdminInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(BootstrapAdminInitializer.class);

    private final AuthProperties authProperties;
    private final UserAccountStore userAccountStore;

    public BootstrapAdminInitializer(AuthProperties authProperties, UserAccountStore userAccountStore) {
        this.authProperties = authProperties;
        this.userAccountStore = userAccountStore;
    }

    @Override
    public void run(ApplicationArguments args) {
        String username = authProperties.getBootstrapAdminUsername();
        String password = authProperties.getBootstrapAdminPassword();
        if (username == null || username.isBlank() || password == null || password.isBlank()) {
            return;
        }

        Optional<UserAccount> existing = userAccountStore.findByUsername(username);
        if (existing.isPresent()) {
            UserAccount account = existing.get();
            if (account.getRole() != UserRole.ADMIN) {
                userAccountStore.updateRole(account.getId(), UserRole.ADMIN);
                log.info("Bootstrap admin role ensured for user '{}'", username);
            }
            if (!PasswordHasher.verify(password, account.getPasswordSalt(), account.getPasswordHash())) {
                userAccountStore.updatePassword(account.getId(), PasswordHasher.hashBcrypt(password));
                log.info("Bootstrap admin password synced for user '{}'", username);
            }
            return;
        }

        UserAccount account = new UserAccount(
                UUID.randomUUID().toString(),
                username,
                username + "@localhost",
                PasswordHasher.hashBcrypt(password),
                "",
                System.currentTimeMillis()
        );
        account.setRole(UserRole.ADMIN);
        userAccountStore.create(account);
        log.info("Bootstrap admin account created: username='{}'", username);
    }
}
