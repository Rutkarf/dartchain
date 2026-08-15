package io.dartchain.backend.character.dto;

/**
 * Métadonnées Character NFT (mint blockchain ultérieur).
 * Un personnage par utilisateur — chemin STL + teinte optionnelle.
 */
public record CharacterNftResponse(
        String userId,
        String characterId,
        String stlPath,
        String displayName,
        boolean minted,
        String tokenId
) {
}
