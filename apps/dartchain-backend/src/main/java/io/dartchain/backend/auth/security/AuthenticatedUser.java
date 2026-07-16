package io.dartchain.backend.auth.security;

import io.dartchain.backend.auth.UserAccount;
import io.dartchain.backend.auth.UserRole;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.List;

public class AuthenticatedUser {

    private final String id;
    private final String username;
    private final String walletAddress;
    private final UserRole role;

    public AuthenticatedUser(UserAccount account) {
        this.id = account.getId();
        this.username = account.getUsername();
        this.walletAddress = account.getWalletAddress();
        this.role = account.getRole();
    }

    public String getId() {
        return id;
    }

    public String getUsername() {
        return username;
    }

    public String getWalletAddress() {
        return walletAddress;
    }

    public UserRole getRole() {
        return role;
    }

    public List<GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }
}
