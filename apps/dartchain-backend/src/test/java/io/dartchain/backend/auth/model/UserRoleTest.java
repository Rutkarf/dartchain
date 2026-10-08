package io.dartchain.backend.auth.model;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class UserRoleTest {

    @Test
    void blankValueStaysUser() {
        assertThat(UserRole.fromValue(null)).isEqualTo(UserRole.USER);
        assertThat(UserRole.fromValue("  ")).isEqualTo(UserRole.USER);
    }

    @Test
    void unknownValueIsRejected() {
        assertThatThrownBy(() -> UserRole.fromValue("GUEST"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> UserRole.fromValue("ROOT"))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
