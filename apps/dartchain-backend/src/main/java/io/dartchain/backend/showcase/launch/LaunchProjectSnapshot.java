package io.dartchain.backend.showcase.launch;

import io.dartchain.backend.showcase.model.LaunchProject;

import java.util.List;

public class LaunchProjectSnapshot {

    private List<LaunchProject> projects = List.of();

    public LaunchProjectSnapshot() {
    }

    public List<LaunchProject> getProjects() {
        return projects;
    }

    public void setProjects(List<LaunchProject> projects) {
        this.projects = projects != null ? projects : List.of();
    }
}
