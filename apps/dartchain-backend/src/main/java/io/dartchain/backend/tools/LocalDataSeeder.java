package io.dartchain.backend.tools;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.stream.Stream;

/**
 * Copie {@code data/seed/*.json} vers {@code data/} si absent — remplace {@code seed-local-data.sh}.
 */
@Component
@ConditionalOnProperty(name = "dartchain.data.seed-local", havingValue = "true")
public class LocalDataSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(LocalDataSeeder.class);

    private final Path dataDir;
    private final Path seedDir;
    private final boolean exitAfterSeed;
    private final ConfigurableApplicationContext applicationContext;

    public LocalDataSeeder(
            @Value("${dartchain.data.dir:data}") String dataDirPath,
            @Value("${dartchain.data.exit-after-seed:false}") boolean exitAfterSeed,
            ConfigurableApplicationContext applicationContext
    ) {
        this.dataDir = Path.of(dataDirPath).toAbsolutePath().normalize();
        this.seedDir = dataDir.resolve("seed");
        this.exitAfterSeed = exitAfterSeed;
        this.applicationContext = applicationContext;
    }

    @Override
    public void run(ApplicationArguments args) throws IOException {
        Files.createDirectories(dataDir);
        if (!Files.isDirectory(seedDir)) {
            log.warn("Seed directory absent : {}", seedDir);
            return;
        }

        try (Stream<Path> templates = Files.list(seedDir)) {
            templates
                    .filter(path -> path.getFileName().toString().endsWith(".json"))
                    .forEach(this::copyIfMissing);
        }

        log.info("Seed local data OK ({})", dataDir);

        if (exitAfterSeed) {
            int exitCode = SpringApplication.exit(applicationContext, () -> 0);
            System.exit(exitCode);
        }
    }

    private void copyIfMissing(Path template) {
        Path target = dataDir.resolve(template.getFileName());
        if (Files.exists(target)) {
            return;
        }
        try {
            Files.copy(template, target, StandardCopyOption.REPLACE_EXISTING);
            log.info("seeded {}", template.getFileName());
        } catch (IOException exception) {
            throw new IllegalStateException("Unable to seed " + template.getFileName(), exception);
        }
    }
}
