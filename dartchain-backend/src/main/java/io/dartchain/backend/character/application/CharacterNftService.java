package io.dartchain.backend.character.application;

import io.dartchain.backend.character.dto.CharacterNftResponse;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Associe un Character NFT conceptuel (1 / user).
 * Pas de mint on-chain pour cette itération — stub prêt pour extension.
 */
@Service
public class CharacterNftService {

    private static final String DEFAULT_STL = "assets/characters/CharacterAnon.fbx";

    private final ConcurrentHashMap<String, CharacterNftResponse> byUser = new ConcurrentHashMap<>();

    /**
     * Retourne (ou crée) le personnage lié à {@code userId}.
     * Les guests anonymes reçoivent un personnage éphémère non persisté durablement.
     */
    public CharacterNftResponse getOrCreateForUser(String userId) {
        String key = (userId == null || userId.isBlank()) ? "guest" : userId.trim();
        return byUser.computeIfAbsent(key, this::createDefault);
    }

    private CharacterNftResponse createDefault(String userId) {
        String characterId = UUID.nameUUIDFromBytes(
                ("character-nft:" + userId).getBytes(StandardCharsets.UTF_8)
        ).toString();
        return new CharacterNftResponse(
                userId,
                characterId,
                DEFAULT_STL,
                "Wanderer",
                false,
                null
        );
    }
}
