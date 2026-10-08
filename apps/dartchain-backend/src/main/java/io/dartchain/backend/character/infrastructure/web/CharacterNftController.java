package io.dartchain.backend.character.infrastructure.web;

import io.dartchain.backend.auth.application.AuthException;
import io.dartchain.backend.auth.model.UserAccount;
import io.dartchain.backend.auth.model.UserRole;
import io.dartchain.backend.auth.security.RoleAuthorizationService;
import io.dartchain.backend.character.application.CharacterNftService;
import io.dartchain.backend.character.dto.CharacterNftResponse;
import io.dartchain.backend.config.ApiRoutes;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Personnage applicatif. Ce n'est pas un contrat.
 */
@RestController
@RequestMapping(ApiRoutes.CHARACTERS_V1_PREFIX)
public class CharacterNftController {

    private final CharacterNftService characterNftService;
    private final RoleAuthorizationService roleAuthorizationService;

    public CharacterNftController(
            CharacterNftService characterNftService,
            RoleAuthorizationService roleAuthorizationService
    ) {
        this.characterNftService = characterNftService;
        this.roleAuthorizationService = roleAuthorizationService;
    }

    @GetMapping("/me")
    public CharacterNftResponse me(
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        UserAccount account = roleAuthorizationService.requireAuthenticated(authorization);
        return characterNftService.getOrCreateForUser(account.getId());
    }

    @GetMapping("/{userId}")
    public CharacterNftResponse byUser(
            @PathVariable String userId,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        UserAccount account = roleAuthorizationService.requireAuthenticated(authorization);
        if (account.getRole() != UserRole.ADMIN && !account.getId().equals(userId)) {
            throw new AuthException(403, "Personnage réservé à son compte");
        }
        return characterNftService.getOrCreateForUser(userId);
    }
}
