package io.dartchain.backend.auth.infrastructure.web;

import io.dartchain.backend.auth.application.AuthService;
import io.dartchain.backend.auth.dto.AuthResponse;
import io.dartchain.backend.auth.dto.LinkWalletRequest;
import io.dartchain.backend.auth.dto.LoginRequest;
import io.dartchain.backend.auth.dto.RefreshRequest;
import io.dartchain.backend.auth.dto.RegisterRequest;
import io.dartchain.backend.auth.dto.UserProfileResponse;
import io.dartchain.backend.web.RequestClientInfo;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse register(@Valid @RequestBody RegisterRequest request, HttpServletRequest httpRequest) {
        return authService.register(request, RequestClientInfo.clientIp(httpRequest));
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        return authService.login(request, RequestClientInfo.clientIp(httpRequest));
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody(required = false) RefreshRequest refreshRequest,
            HttpServletRequest httpRequest
    ) {
        authService.logout(authorization, refreshRequest, RequestClientInfo.clientIp(httpRequest));
    }

    @GetMapping("/me")
    public UserProfileResponse me(@RequestHeader(value = "Authorization", required = false) String authorization) {
        return authService.me(authorization);
    }

    @PutMapping("/me/wallet")
    public UserProfileResponse linkWallet(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @Valid @RequestBody LinkWalletRequest request
    ) {
        return authService.linkWallet(authorization, request);
    }
}
