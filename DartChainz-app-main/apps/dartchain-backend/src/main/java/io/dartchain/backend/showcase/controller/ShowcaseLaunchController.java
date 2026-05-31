package io.dartchain.backend.showcase.controller;

import io.dartchain.backend.showcase.dto.CreateLaunchProjectRequest;
import io.dartchain.backend.showcase.dto.LaunchProjectResponse;
import io.dartchain.backend.showcase.service.LaunchLabService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/showcase/launch")
public class ShowcaseLaunchController {

    private final LaunchLabService launchLabService;

    public ShowcaseLaunchController(LaunchLabService launchLabService) {
        this.launchLabService = launchLabService;
    }

    @GetMapping("/projects")
    public List<LaunchProjectResponse> listProjects() {
        return launchLabService.listProjects();
    }

    @PostMapping("/projects")
    @ResponseStatus(HttpStatus.CREATED)
    public LaunchProjectResponse createProject(@Valid @RequestBody CreateLaunchProjectRequest request) {
        try {
            return launchLabService.createProject(request);
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, exception.getMessage());
        }
    }
}
