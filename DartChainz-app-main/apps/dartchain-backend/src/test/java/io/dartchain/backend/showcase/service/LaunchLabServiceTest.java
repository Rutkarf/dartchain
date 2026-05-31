package io.dartchain.backend.showcase.service;

import io.dartchain.backend.showcase.dto.CreateLaunchProjectRequest;
import io.dartchain.backend.showcase.dto.LaunchProjectResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class LaunchLabServiceTest {

    private LaunchLabService launchLabService;

    @BeforeEach
    void setUp() {
        launchLabService = new LaunchLabService();
        launchLabService.seedProjects();
    }

    @Test
    void listProjects_returnsSeededProjects() {
        List<LaunchProjectResponse> projects = launchLabService.listProjects();

        assertThat(projects).hasSizeGreaterThanOrEqualTo(3);
        assertThat(projects).anyMatch(project -> project.symbol().equals("DART"));
    }

    @Test
    void createProject_addsSoonProject() {
        LaunchProjectResponse created = launchLabService.createProject(
                new CreateLaunchProjectRequest(
                        "My Token",
                        "MTK",
                        new BigDecimal("5000"),
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null
                )
        );

        assertThat(created.symbol()).isEqualTo("MTK");
        assertThat(created.status()).isEqualTo("SOON");
        assertThat(launchLabService.listProjects()).anyMatch(p -> p.symbol().equals("MTK"));
    }

    @Test
    void createProject_rejectsDuplicateSymbol() {
        assertThatThrownBy(() ->
                launchLabService.createProject(
                        new CreateLaunchProjectRequest(
                                "Duplicate",
                                "DART",
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null
                        )
                )
        ).isInstanceOf(IllegalArgumentException.class);
    }
}
