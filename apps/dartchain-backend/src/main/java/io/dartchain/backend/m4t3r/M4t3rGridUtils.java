package io.dartchain.backend.m4t3r;

public final class M4t3rGridUtils {

    static final double RENDER_CELL_SIZE = 1.25;

    private M4t3rGridUtils() {
    }

    /** Damier diagonal sur la grille de rendu 1,25 m. */
    public static boolean isOnDiagonalCheckerboard(int renderGx, int renderGz) {
        return ((renderGx + renderGz) & 1) == 0;
    }

    public static boolean isClusterOnCheckerboard(int clusterGx, int clusterGz, double clusterSize) {
        double x = (clusterGx + 0.5) * clusterSize;
        double z = (clusterGz + 0.5) * clusterSize;
        int renderGx = (int) Math.floor(x / RENDER_CELL_SIZE);
        int renderGz = (int) Math.floor(z / RENDER_CELL_SIZE);
        return isOnDiagonalCheckerboard(renderGx, renderGz);
    }

    public static String tokenId(String worldId, String clusterCellId, long cycle) {
        int[] grid = parseClusterGrid(clusterCellId);
        if (grid == null) {
            return "m4t3r:" + worldId + ":unknown:cycle-" + cycle;
        }
        String chunkId = chunkIdFromGrid(grid[0], grid[1]);
        return "m4t3r:" + worldId + ":" + chunkId + ":" + grid[0] + ":" + grid[1] + ":cycle-" + cycle;
    }

    public static String chunkIdFromGrid(int gridX, int gridZ) {
        int chunkSize = 128;
        int cx = (int) Math.floor((gridX * M4t3rTrailService.CLUSTER_SIZE) / chunkSize);
        int cz = (int) Math.floor((gridZ * M4t3rTrailService.CLUSTER_SIZE) / chunkSize);
        return "chunk:" + cx + ":" + cz;
    }

    static int[] parseClusterGrid(String cellId) {
        if (cellId == null || !cellId.startsWith("m4t3r-cluster:")) {
            return null;
        }
        String[] parts = cellId.split(":");
        if (parts.length != 3) {
            return null;
        }
        try {
            return new int[] { Integer.parseInt(parts[1]), Integer.parseInt(parts[2]) };
        } catch (NumberFormatException exception) {
            return null;
        }
    }
}
