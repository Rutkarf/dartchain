package io.dartchain.backend.showcase.launch;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.dartchain.backend.showcase.launch.store.LaunchProjectStore;
import io.dartchain.backend.showcase.model.LaunchProject;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Component
@ConditionalOnProperty(name = "dartchain.persistence.mode", havingValue = "memory", matchIfMissing = true)
public class JsonLaunchProjectStore implements LaunchProjectStore {

    private static final Logger log = LoggerFactory.getLogger(JsonLaunchProjectStore.class);

    private final ObjectMapper objectMapper;
    private final Path storePath;
    private final List<LaunchProject> projects = new ArrayList<>();

    public JsonLaunchProjectStore(
            ObjectMapper objectMapper,
            @Value("${launch.projects.path:data/launch-projects.json}") String storePath
    ) {
        this.objectMapper = objectMapper;
        this.storePath = Path.of(storePath);
    }

    @PostConstruct
    public void loadFromDisk() {
        if (!Files.exists(storePath)) {
            return;
        }

        try {
            LaunchProjectSnapshot snapshot = objectMapper.readValue(
                    Files.readString(storePath),
                    LaunchProjectSnapshot.class
            );
            synchronized (projects) {
                projects.clear();
                projects.addAll(snapshot.getProjects());
            }
        } catch (IOException exception) {
            throw new IllegalStateException("Unable to load launch projects from " + storePath, exception);
        }
    }

    @Override
    public synchronized List<LaunchProject> findAll() {
        return projects.stream().map(this::cloneProject).toList();
    }

    @Override
    public synchronized void save(LaunchProject project) {
        projects.add(cloneProject(project));
        persist();
    }

    @Override
    public synchronized void saveAll(List<LaunchProject> items) {
        projects.clear();
        if (items != null) {
            projects.addAll(items.stream().map(this::cloneProject).toList());
        }
        persist();
    }

    @Override
    public synchronized boolean existsBySymbol(String symbol) {
        if (symbol == null || symbol.isBlank()) {
            return false;
        }

        String normalized = symbol.trim().toUpperCase(Locale.ROOT);
        return projects.stream()
                .anyMatch(project -> project.getSymbol().equalsIgnoreCase(normalized));
    }

    private void persist() {
        try {
            if (storePath.getParent() != null) {
                Files.createDirectories(storePath.getParent());
            }

            LaunchProjectSnapshot snapshot = new LaunchProjectSnapshot();
            snapshot.setProjects(projects.stream().map(this::cloneProject).toList());
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(storePath.toFile(), snapshot);
        } catch (IOException exception) {
            log.warn("Unable to persist launch projects to {}: {}", storePath, exception.getMessage());
        }
    }

    private LaunchProject cloneProject(LaunchProject source) {
        return objectMapper.convertValue(source, LaunchProject.class);
    }
}
