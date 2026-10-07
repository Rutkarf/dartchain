package io.dartchain.backend.shared.config;

import io.dartchain.backend.auth.security.BearerTokenAuthenticationFilter;
import io.dartchain.backend.auth.security.RateLimitFilter;
import io.dartchain.backend.auth.security.SecurityProblemSupport;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.config.annotation.web.configuration.WebSecurityCustomizer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfigurationSource;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public WebSecurityCustomizer removedWalletCreateIsNotAnEndpoint() {
        return web -> web.ignoring().requestMatchers(HttpMethod.POST, "/api/wallets/create");
    }

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            RateLimitFilter rateLimitFilter,
            BearerTokenAuthenticationFilter bearerTokenAuthenticationFilter,
            SecurityProblemSupport securityProblemSupport,
            CorsConfigurationSource corsConfigurationSource
    ) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> cors.configurationSource(corsConfigurationSource))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint(securityProblemSupport)
                        .accessDeniedHandler(securityProblemSupport)
                )
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/ws/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/register", "/api/auth/login").permitAll()
                        .requestMatchers(
                                HttpMethod.POST,
                                "/api/v1/auth/register",
                                "/api/v1/auth/login",
                                "/api/v1/auth/refresh",
                                "/api/v1/auth/email/confirm",
                                "/api/v1/auth/email/resend",
                                "/api/v1/auth/2fa/verify",
                                "/api/v1/auth/oauth/exchange",
                                "/api/v1/admin/unlock"
                        ).permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/auth/oauth/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/auth/oauth/connect/apple/callback").permitAll()
                        .requestMatchers(
                                HttpMethod.POST,
                                "/api/wallets/verify",
                                "/api/wallets/create-client"
                        ).permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/wallets/generate-evm").permitAll()
                        .requestMatchers(
                                "/actuator/health",
                                "/actuator/health/**",
                                "/actuator/info",
                                "/actuator/**"
                        ).permitAll()
                        .requestMatchers(HttpMethod.GET,
                                "/",
                                "/api/hello",
                                "/api/banner",
                                "/api/health",
                                "/api/v1/health",
                                "/api/v1/contract",
                                "/api/v1/chain/config",
                                "/api/v1/admin/status",
                                "/api/blocks",
                                "/api/blocks/**",
                                "/api/blockchain/**",
                                "/api/v1/blockchain/**",
                                "/api/pending-transactions",
                                "/api/transactions/pending",
                                "/api/stats",
                                "/api/explorer/**",
                                "/api/v1/explorer/**",
                                "/api/peers",
                                "/api/peers/stats",
                                "/api/showcase/**",
                                "/api/graph",
                                "/api/graph/**",
                                "/api/faucet/config",
                                "/api/faucet/state/**",
                                "/api/quests/catalog",
                                "/api/quests/state",
                                "/api/exchange-panel",
                                "/api/exchange-panel/portfolio",
                                "/api/swap",
                                "/api/crypto-rates/**",
                                "/api/metaverse/**",
                                "/api/m4t3r/trail-cells",
                                "/api/m4t3r/rewards/**"
                        ).permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/showcase/chat/messages").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/m4t3r/trail-pickup").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/metaverse/overpass").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/metaverse/placements/*/inquiries").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/access/status").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/access/age-decline").permitAll()
                        .anyRequest().authenticated()
                )
                .addFilterBefore(bearerTokenAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(rateLimitFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
