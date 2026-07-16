package io.dartchain.backend.tools;

import io.dartchain.backend.config.DataImportProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "dartchain.data-import.enabled", havingValue = "true")
@org.springframework.boot.autoconfigure.condition.ConditionalOnBean(JsonDatastoreImporter.class)
public class JsonDatastoreImportRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(JsonDatastoreImportRunner.class);

    private final JsonDatastoreImporter importer;
    private final DataImportProperties properties;
    private final ConfigurableApplicationContext applicationContext;

    public JsonDatastoreImportRunner(
            JsonDatastoreImporter importer,
            DataImportProperties properties,
            ConfigurableApplicationContext applicationContext
    ) {
        this.importer = importer;
        this.properties = properties;
        this.applicationContext = applicationContext;
    }

    @Override
    public void run(ApplicationArguments args) {
        log.info("Phase P — démarrage import JSON → Postgres");
        JsonDatastoreImportReport report = importer.importAll();
        report.getImportedCounts().forEach((dataset, count) ->
                log.info("  • {} : {} enregistrement(s)", dataset, count)
        );
        report.getSkippedFiles().forEach((dataset, reason) ->
                log.warn("  • {} ignoré ({})", dataset, reason)
        );

        if (properties.isExitAfterImport()) {
            int exitCode = SpringApplication.exit(applicationContext, () -> 0);
            System.exit(exitCode);
        }
    }
}
