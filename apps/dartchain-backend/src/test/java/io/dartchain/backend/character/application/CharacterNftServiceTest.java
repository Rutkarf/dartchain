package io.dartchain.backend.character.application;

import io.dartchain.backend.character.dto.CharacterNftResponse;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class CharacterNftServiceTest {

    private final CharacterNftService service = new CharacterNftService();

    @Test
    void getOrCreateForUser_reusesSameCharacter() {
        CharacterNftResponse first = service.getOrCreateForUser("alice");
        CharacterNftResponse second = service.getOrCreateForUser("alice");

        assertThat(second.characterId()).isEqualTo(first.characterId());
        assertThat(second.stlPath()).contains("CharacterAnon");
    }

    @Test
    void getOrCreateForUser_guestUsesGuestKey() {
        CharacterNftResponse guest = service.getOrCreateForUser("  ");
        CharacterNftResponse named = service.getOrCreateForUser("bob");

        assertThat(guest.userId()).isEqualTo("guest");
        assertThat(named.userId()).isEqualTo("bob");
        assertThat(named.characterId()).isNotEqualTo(guest.characterId());
    }
}
