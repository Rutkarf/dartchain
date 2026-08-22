package io.dartchain.backend.showcase.application;

import io.dartchain.backend.showcase.dto.CreateLaunchProjectRequest;
import io.dartchain.backend.showcase.dto.LaunchProjectResponse;
import io.dartchain.backend.showcase.launch.store.LaunchProjectStore;
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

    private final LaunchProjectStore launchProjectStore;
    private final CopyOnWriteArrayList<LaunchProject> projects = new CopyOnWriteArrayList<>();

    public LaunchLabService(LaunchProjectStore launchProjectStore) {
        this.launchProjectStore = launchProjectStore;
    }

    @PostConstruct
    public void seedProjects() {
        List<LaunchProject> loaded = launchProjectStore.findAll();
        if (!loaded.isEmpty()) {
            projects.clear();
            projects.addAll(loaded);
            return;
        }

        List<LaunchProject> seeded = List.of(
                seed(
                        "r4v3",
                        "R4V3",
                        "R4V3",
                        LaunchStatus.LIVE,
                        "8100",
                        "25000",
                        null,
                        "Token natif de l'écosystème DartChain, indexé CHF.",
                        "https://dartchain.io/whitepaper/r4v3.pdf",
                        "https://dartchain.io",
                        "2026-Q1"
                ),
                seed(
                        "lab-03",
                        "Lab #03",
                        "LAB3",
                        LaunchStatus.SOON,
                        "0",
                        "10000",
                        null,
                        "Projet expérimental LaunchLab orienté gouvernance communautaire.",
                        "https://dartchain.io/whitepaper/lab3.pdf",
                        "https://dartchain.io/lab3",
                        "2026-Q3"
                ),
                seed(
                        "lab-04",
                        "NovaFi",
                        "NVFI",
                        LaunchStatus.SOON,
                        "1200",
                        "15000",
                        null,
                        "Infrastructure DeFi modulaire pour actifs tokenisés.",
                        "https://dartchain.io/whitepaper/novafi.pdf",
                        "https://novafi.example",
                        "2026-Q2"
                ),
                seed(
                        "lab-05",
                        "Pixel DAO",
                        "PXD",
                        LaunchStatus.LIVE,
                        "4200",
                        "8000",
                        null,
                        "DAO créative pour collections NFT et trésorerie on-chain.",
                        "https://dartchain.io/whitepaper/pxd.pdf",
                        "https://pixeldao.example",
                        "2026-Q1"
                ),
                seed(
                        "lab-06",
                        "Orbit Swap",
                        "ORB",
                        LaunchStatus.SOON,
                        "0",
                        "20000",
                        null,
                        "AMM cross-chain à faible latence pour paires LaunchLab.",
                        null,
                        "https://orbitswap.example",
                        "2026-Q4"
                ),
                seed(
                        "lab-07",
                        "Chain Pets",
                        "CPET",
                        LaunchStatus.ENDED,
                        "19000",
                        "19000",
                        null,
                        "Collection GameFi clôturée après atteinte du hard cap.",
                        "https://dartchain.io/whitepaper/cpet.pdf",
                        "https://chainpets.example",
                        "2025-Q4"
                ),
                seed(
                        "lab-08",
                        "Meta Rail",
                        "MRAIL",
                        LaunchStatus.SOON,
                        "800",
                        "12000",
                        null,
                        "Rail de liquidité pour actifs synthétiques R4V3.",
                        "https://dartchain.io/whitepaper/mrail.pdf",
                        "https://metarail.example",
                        "2026-Q3"
                )
        );

        projects.addAll(seeded);
        launchProjectStore.saveAll(seeded);
    }

    public List<LaunchProjectResponse> listProjects() {
        return projects.stream()
                .sorted(Comparator
                        .comparing(LaunchProject::getStatus, this::statusOrder)
                        .thenComparing(LaunchProject::getCreatedAt, Comparator.reverseOrder()))
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public List<String> listSymbols() {
        return projects.stream()
                .map(LaunchProject::getSymbol)
                .map(symbol -> symbol.trim().toUpperCase(Locale.ROOT))
                .distinct()
                .collect(Collectors.toList());
    }

    public boolean isLaunchToken(String symbol) {
        if (symbol == null || symbol.isBlank()) {
            return false;
        }

        String normalized = symbol.trim().toUpperCase(Locale.ROOT);
        return projects.stream()
                .anyMatch(project -> project.getSymbol().equalsIgnoreCase(normalized));
    }

    public LaunchProjectResponse createProject(CreateLaunchProjectRequest request) {
        String symbol = request.symbol().trim().toUpperCase(Locale.ROOT);
        String name = request.name().trim();

        if (launchProjectStore.existsBySymbol(symbol)) {
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
                normalizeOptional(request.chain()),
                normalizeOptional(request.whitepaperUrl()),
                normalizeOptional(request.website()),
                normalizeOptional(request.launchDate())
        );

        projects.add(project);
        launchProjectStore.save(project);
        return toResponse(project);
    }

    private LaunchProject seed(
            String id,
            String name,
            String symbol,
            LaunchStatus status,
            String raised,
            String target,
            String logoUrl,
            String description,
            String whitepaperUrl,
            String website,
            String launchDate
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
                description,
                "DartChain",
                whitepaperUrl,
                website,
                launchDate
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
                project.getLogoUrl(),
                project.getDescription(),
                project.getChain(),
                project.getWhitepaperUrl(),
                project.getWebsite(),
                project.getLaunchDate()
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
