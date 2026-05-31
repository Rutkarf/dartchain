package io.dartchain.backend.showcase.service;

import io.dartchain.backend.showcase.dto.CreateLaunchProjectRequest;
import io.dartchain.backend.showcase.dto.LaunchProjectResponse;
import io.dartchain.backend.showcase.model.LaunchProject;
import io.dartchain.backend.showcase.model.LaunchStatus;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.stream.Collectors;

@Service
public class LaunchLabService {

    private final CopyOnWriteArrayList<LaunchProject> projects = new CopyOnWriteArrayList<>();

    @PostConstruct
    public void seedProjects() {
        if (!projects.isEmpty()) {
            return;
        }

        projects.add(seed("dart", "DART", "DART", LaunchStatus.LIVE, "12400", "50000", null));
        projects.add(seed("r4v3", "R4V3", "R4V3", LaunchStatus.LIVE, "8100", "25000", null));
        projects.add(seed("lab-03", "Lab #03", "LAB3", LaunchStatus.SOON, "0", "10000", null));
        projects.add(seed("lab-04", "NovaFi", "NVFI", LaunchStatus.SOON, "1200", "15000", null));
        projects.add(seed("lab-05", "Pixel DAO", "PXD", LaunchStatus.LIVE, "4200", "8000", null));
        projects.add(seed("lab-06", "Orbit Swap", "ORB", LaunchStatus.SOON, "0", "20000", null));
        projects.add(seed("lab-07", "Chain Pets", "CPET", LaunchStatus.ENDED, "19000", "19000", null));
        projects.add(seed("lab-08", "Meta Rail", "MRAIL", LaunchStatus.SOON, "800", "12000", null));
    }

    public List<LaunchProjectResponse> listProjects() {
        return projects.stream()
                .sorted(Comparator
                        .comparing(LaunchProject::getStatus, this::statusOrder)
                        .thenComparing(LaunchProject::getCreatedAt, Comparator.reverseOrder()))
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public LaunchProjectResponse createProject(CreateLaunchProjectRequest request) {
        String symbol = request.symbol().trim().toUpperCase(Locale.ROOT);
        String name = request.name().trim();

        boolean symbolExists = projects.stream()
                .anyMatch(project -> project.getSymbol().equalsIgnoreCase(symbol));

        if (symbolExists) {
            throw new IllegalArgumentException("Un projet avec ce symbole existe déjà");
        }

        BigDecimal target = request.targetAmount() != null
                ? request.targetAmount().max(BigDecimal.ZERO)
                : BigDecimal.ZERO;

        LaunchProject project = new LaunchProject(
                UUID.randomUUID().toString(),
                name,
                symbol,
                LaunchStatus.SOON,
                BigDecimal.ZERO,
                target,
                Instant.now(),
                normalizeOptional(request.logoUrl()),
                normalizeOptional(request.description()),
                normalizeOptional(request.chain())
        );

        projects.add(project);
        return toResponse(project);
    }

    private LaunchProject seed(
            String id,
            String name,
            String symbol,
            LaunchStatus status,
            String raised,
            String target,
            String logoUrl
    ) {
        return new LaunchProject(
                id,
                name,
                symbol,
                status,
                new BigDecimal(raised),
                new BigDecimal(target),
                Instant.now(),
                logoUrl,
                null,
                null
        );
    }

    private LaunchProjectResponse toResponse(LaunchProject project) {
        return new LaunchProjectResponse(
                project.getId(),
                project.getName(),
                project.getSymbol(),
                project.getStatus().name(),
                formatAmount(project.getRaisedAmount()),
                formatAmount(project.getTargetAmount()),
                project.getLogoUrl()
        );
    }

    private String normalizeOptional(String value) {
        if (value == null) {
            return null;
        }

        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String formatAmount(BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            return "—";
        }

        BigDecimal normalized = amount.setScale(0, RoundingMode.HALF_UP);

        if (normalized.compareTo(new BigDecimal("1000")) >= 0) {
            return normalized
                    .divide(new BigDecimal("1000"), 1, RoundingMode.HALF_UP)
                    .stripTrailingZeros()
                    .toPlainString()
                    + "k";
        }

        return normalized.toPlainString();
    }

    private int statusOrder(LaunchStatus left, LaunchStatus right) {
        return Integer.compare(rank(left), rank(right));
    }

    private int rank(LaunchStatus status) {
        return switch (status) {
            case LIVE -> 0;
            case SOON -> 1;
            case ENDED -> 2;
        };
    }
}
