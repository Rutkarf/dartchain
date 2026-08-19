package io.dartchain.backend.m4t3r;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class M4t3rGridUtilsTest {

    @Test
    void keepsHalfDensityOnDiagonalCheckerboard() {
        assertThat(M4t3rGridUtils.isOnDiagonalCheckerboard(0, 0)).isTrue();
        assertThat(M4t3rGridUtils.isOnDiagonalCheckerboard(1, 0)).isFalse();
        assertThat(M4t3rGridUtils.isOnDiagonalCheckerboard(0, 1)).isFalse();
        assertThat(M4t3rGridUtils.isOnDiagonalCheckerboard(2, 2)).isTrue();
        assertThat(M4t3rGridUtils.isOnDiagonalCheckerboard(-1, 0)).isFalse();
        assertThat(M4t3rGridUtils.isOnDiagonalCheckerboard(-1, -1)).isTrue();
    }

    @Test
    void mapsVisualClusterToRenderGridCheckerboard() {
        assertThat(M4t3rGridUtils.isClusterOnCheckerboard(0, 0, M4t3rTrailService.CLUSTER_SIZE)).isTrue();
        assertThat(M4t3rGridUtils.isClusterOnCheckerboard(13, 4, M4t3rTrailService.CLUSTER_SIZE)).isFalse();
    }
}
