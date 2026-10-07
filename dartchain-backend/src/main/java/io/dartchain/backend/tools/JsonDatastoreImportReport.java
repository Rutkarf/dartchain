package io.dartchain.backend.tools;

import java.util.LinkedHashMap;
import java.util.Map;

public class JsonDatastoreImportReport {

    private final Map<String, Integer> importedCounts = new LinkedHashMap<>();
    private final Map<String, String> skippedFiles = new LinkedHashMap<>();

    public void recordImported(String dataset, int count) {
        importedCounts.put(dataset, count);
    }

    public void recordSkipped(String dataset, String reason) {
        skippedFiles.put(dataset, reason);
    }

    public Map<String, Integer> getImportedCounts() {
        return importedCounts;
    }

    public Map<String, String> getSkippedFiles() {
        return skippedFiles;
    }

    public int totalImported() {
        return importedCounts.values().stream().mapToInt(Integer::intValue).sum();
    }
}
