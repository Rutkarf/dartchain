import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

/** Réponse stub backend Character NFT. */
export interface CharacterNftDto {
  userId: string;
  characterId: string;
  stlPath: string; // chemin modèle (FBX / STL)
  displayName: string;
  minted: boolean;
  tokenId: string | null;
}

/**
 * Client HTTP optionnel — le mesh est chargé localement ;
 * l’API prépare l’association user ↔ STL / mint futur.
 */
@Injectable({ providedIn: 'root' })
export class CharacterNftApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/v1/characters`;

  async fetchMine(userId?: string): Promise<CharacterNftDto | null> {
    try {
      const headers: Record<string, string> = {};
      if (userId) headers['X-User-Id'] = userId;
      return await firstValueFrom(
        this.http.get<CharacterNftDto>(`${this.base}/me`, { headers })
      );
    } catch {
      return null;
    }
  }
}
