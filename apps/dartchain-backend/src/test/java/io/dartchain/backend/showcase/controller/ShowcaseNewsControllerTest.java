package io.dartchain.backend.showcase.controller;

import io.dartchain.backend.auth.AuthTokenResolver;
import io.dartchain.backend.auth.security.BearerTokenAuthenticationFilter;
import io.dartchain.backend.auth.security.RateLimitCounterStore;
import io.dartchain.backend.auth.security.RateLimitFilter;
import io.dartchain.backend.auth.store.SessionStore;
import io.dartchain.backend.auth.store.UserAccountStore;
import io.dartchain.backend.config.DartchainConfiguration;
import io.dartchain.backend.showcase.dto.NewsFeedResponse;
import io.dartchain.backend.showcase.dto.NewsItemResponse;
import io.dartchain.backend.showcase.application.NewsService;
import io.dartchain.backend.showcase.infrastructure.web.ShowcaseNewsController;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ShowcaseNewsController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import({DartchainConfiguration.class, ShowcaseNewsControllerTest.PermitAllSecurityTestConfig.class})
class ShowcaseNewsControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private NewsService newsService;

    @MockBean
    private SessionStore sessionStore;

    @MockBean
    private UserAccountStore userAccountStore;

    @MockBean
    private AuthTokenResolver authTokenResolver;

    @MockBean
    private RateLimitCounterStore rateLimitCounterStore;

    @MockBean
    private RateLimitFilter rateLimitFilter;

    @MockBean
    private BearerTokenAuthenticationFilter bearerTokenAuthenticationFilter;

    @Test
    void getFeed_returnsOk() throws Exception {
        when(newsService.getFeed(isNull(), isNull(), anyInt(), anyInt())).thenReturn(
                new NewsFeedResponse(
                        "DartChain",
                        "TX",
                        "editorial-1",
                        List.of(new NewsItemResponse(
                                "1",
                                "Réseau",
                                "Title",
                                "Summary",
                                "Body",
                                "2026-01-01T00:00:00Z",
                                "il y a 1 min",
                                "EDITORIAL",
                                "NONE",
                                null,
                                true
                        )),
                        List.of("Réseau"),
                        "Bloc #0 · chaîne active",
                        "2026-01-01T00:00:00Z",
                        1,
                        false
                )
        );

        mockMvc.perform(get("/api/showcase/news"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.headline").value("DartChain"))
                .andExpect(jsonPath("$.items[0].title").value("Title"))
                .andExpect(jsonPath("$.liveActivity").value("Bloc #0 · chaîne active"));
    }

    @TestConfiguration
    static class PermitAllSecurityTestConfig {

        @Bean
        @Primary
        SecurityFilterChain permitAllSecurityFilterChain(HttpSecurity http) throws Exception {
            return http
                    .csrf(AbstractHttpConfigurer::disable)
                    .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
                    .build();
        }
    }
}
