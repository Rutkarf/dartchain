package io.dartchain.backend.character.infrastructure.web;

import io.dartchain.backend.character.application.CharacterNftService;
import io.dartchain.backend.character.dto.CharacterNftResponse;
import io.dartchain.backend.config.ApiRoutes;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * API Character NFT — lecture seule pour l’instant (STL path + id).
 */
@RestController
@RequestMapping(ApiRoutes.CHARACTERS_V1_PREFIX)
public class CharacterNftController {

    private final CharacterNftService characterNftService;

    public CharacterNftController(CharacterNftService characterNftService) {
        this.characterNftService = characterNftService;
    }

    /**
     * Personnage du user authentifié (Authorization optionnel → guest).
     * Le frontend peut ignorer la réponse et utiliser le STL local par défaut.
     */
    @GetMapping("/me")
    public CharacterNftResponse me(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        String userId = resolveUserId(userIdHeader, authorization);
        return characterNftService.getOrCreateForUser(userId);
    }

    @GetMapping("/{userId}")
    public CharacterNftResponse byUser(@PathVariable String userId) {
        return characterNftService.getOrCreateForUser(userId);
    }

    private static String resolveUserId(String userIdHeader, String authorization) {
        if (userIdHeader != null && !userIdHeader.isBlank()) {
            return userIdHeader.trim();
        }
        // Placeholder : sans parsing JWT ici — guest si pas de header.
        // Auth complète branchée plus tard via AuthService.me().
        if (authorization != null && authorization.startsWith("Bearer ")) {
            return "authed-user";
        }
        return "guest";
    }
}
