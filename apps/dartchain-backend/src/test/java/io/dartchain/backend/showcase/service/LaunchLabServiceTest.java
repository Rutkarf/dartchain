package io.dartchain.backend.showcase.service;

import io.dartchain.backend.showcase.dto.CreateLaunchProjectRequest;
import io.dartchain.backend.showcase.dto.LaunchProjectResponse;
import io.dartchain.backend.showcase.launch.JsonLaunchProjectStore;
import io.dartchain.backend.support.TestObjectMapper;
import io.dartchain.backend.showcase.application.LaunchLabService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.math.BigDecimal;
import java.nio.file.Path;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class LaunchLabServiceTest {

    @TempDir
    Path tempDir;

    private LaunchLabService launchLabService;

    @BeforeEach
    void setUp() {
        launchLabService = new LaunchLabService(new JsonLaunchProjectStore(
                TestObjectMapper.create(),
                tempDir.resolve("launch-projects.json").toString()
        ));
        launchLabService.seedProjects();
    }

    @Test
    void listProjects_returnsSeededProjects() {
        List<LaunchProjectResponse> projects = launchLabService.listProjects();

        assertThat(projects).hasSizeGreaterThanOrEqualTo(3);
        assertThat(projects).anyMatch(project -> project.symbol().equals("R4V3"));
    }

    @Test
    void createProject_addsSoonProject() {
        LaunchProjectResponse created = launchLabService.createProject(
                new CreateLaunchProjectRequest(
                        "My Token",
                        "MTK",
                        new BigDecimal("5000"),
                        "Token expérimental pour tests LaunchLab.",
                        null,
                        "DartChain",
                        null,
                        null,
                        "https://dartchain.io",
                        "https://dartchain.io/whitepaper/mtk.pdf",
                        null,
                        null,
                        null,
                        null,
                        null,
                        "2026-Q4",
                        null
                )
        );

        assertThat(created.symbol()).isEqualTo("MTK");
        assertThat(created.status()).isEqualTo("SOON");
        assertThat(created.description()).isEqualTo("Token expérimental pour tests LaunchLab.");
        assertThat(created.whitepaperUrl()).isEqualTo("https://dartchain.io/whitepaper/mtk.pdf");
        assertThat(created.website()).isEqualTo("https://dartchain.io");
        assertThat(created.launchDate()).isEqualTo("2026-Q4");
        assertThat(launchLabService.listProjects()).anyMatch(p -> p.symbol().equals("MTK"));
    }

    @Test
    void listProjects_exposesDescriptionAndWhitepaperForSeededProjects() {
        List<LaunchProjectResponse> projects = launchLabService.listProjects();
        LaunchProjectResponse r4v3 = projects.stream()
                .filter(project -> project.symbol().equals("R4V3"))
                .findFirst()
                .orElseThrow();

        assertThat(r4v3.description()).contains("DartChain");
        assertThat(r4v3.whitepaperUrl()).contains("whitepaper");
    }

    @Test
    void createProject_rejectsDuplicateSymbol() {
        assertThatThrownBy(() ->
                launchLabService.createProject(
                        new CreateLaunchProjectRequest(
                                "Duplicate",
                                "R4V3",
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
