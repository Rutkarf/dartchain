/**
 * Catalogue (design) vs progression joueur (runtime).
 * Persistance locale preview — pas de crédit faucet / on-chain.
 */

import {
  cloneStarQuest,
  starQuestClaimKind,
  type StarQuest,
} from './star-conquest.model';

export const STAR_CONQUEST_PROGRESS_STORAGE_KEY = 'star-conquest-progress-v1';

export type StarConquestFunnelStep = 'views' | 'picks' | 'panels' | 'claims';

export interface StarConquestClaimRecord {
  claimedAt: number;
  rewardM4T3R: number;
}

export interface StarConquestFunnel {
  views: number;
  picks: number;
  panels: number;
  claims: number;
}

export interface StarConquestProgressSnapshot {
  version: 1;
  claimed: Record<string, StarConquestClaimRecord>;
  funnel: StarConquestFunnel;
}

export type StarConquestClaimReason =
  | 'missing'
  | 'locked'
  | 'future'
  | 'already-claimed'
  | 'action-required';

export type StarConquestClaimResult =
  | { ok: true; snapshot: StarConquestProgressSnapshot; quest: StarQuest }
  | {
      ok: false;
      reason: StarConquestClaimReason;
      snapshot: StarConquestProgressSnapshot;
      quest?: StarQuest;
    };

export function emptyStarConquestProgress(): StarConquestProgressSnapshot {
  return {
    version: 1,
    claimed: {},
    funnel: { views: 0, picks: 0, panels: 0, claims: 0 },
  };
}

export function parseStarConquestProgress(raw: unknown): StarConquestProgressSnapshot {
  const empty = emptyStarConquestProgress();
  if (!raw || typeof raw !== 'object') return empty;
  const data = raw as Partial<StarConquestProgressSnapshot>;
  if (data.version !== 1) return empty;

  const claimed: Record<string, StarConquestClaimRecord> = {};
  if (data.claimed && typeof data.claimed === 'object') {
    for (const [id, record] of Object.entries(data.claimed)) {
      if (!record || typeof record !== 'object') continue;
      const reward = Number(record.rewardM4T3R);
      const claimedAt = Number(record.claimedAt);
      if (!id || !Number.isFinite(reward) || reward <= 0 || !Number.isFinite(claimedAt)) {
        continue;
      }
      claimed[id] = { claimedAt, rewardM4T3R: reward };
    }
  }

  const funnelSrc = data.funnel;
  const funnel: StarConquestFunnel = {
    views: asCount(funnelSrc?.views),
    picks: asCount(funnelSrc?.picks),
    panels: asCount(funnelSrc?.panels),
    claims: asCount(funnelSrc?.claims),
  };

  return { version: 1, claimed, funnel };
}

function asCount(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

export function loadStarConquestProgress(
  storage: Pick<Storage, 'getItem'> | null | undefined = typeof localStorage === 'undefined'
    ? null
    : localStorage
): StarConquestProgressSnapshot {
  if (!storage) return emptyStarConquestProgress();
  try {
    const raw = storage.getItem(STAR_CONQUEST_PROGRESS_STORAGE_KEY);
    if (!raw) return emptyStarConquestProgress();
    return parseStarConquestProgress(JSON.parse(raw));
  } catch {
    return emptyStarConquestProgress();
  }
}

export function saveStarConquestProgress(
  snapshot: StarConquestProgressSnapshot,
  storage: Pick<Storage, 'setItem'> | null | undefined = typeof localStorage === 'undefined'
    ? null
    : localStorage
): void {
  if (!storage) return;
  storage.setItem(STAR_CONQUEST_PROGRESS_STORAGE_KEY, JSON.stringify(snapshot));
}

export function previewM4T3RTotal(snapshot: StarConquestProgressSnapshot): number {
  let total = 0;
  for (const record of Object.values(snapshot.claimed)) {
    total += record.rewardM4T3R;
  }
  return total;
}

export function claimedQuestCount(snapshot: StarConquestProgressSnapshot): number {
  return Object.keys(snapshot.claimed).length;
}

/**
 * Applique la progression joueur sur le catalogue design.
 * Une quête `locked` passe `available` si un voisin connecté est conquis.
 */
export function hydrateStarQuestCatalog(
  catalog: readonly StarQuest[],
  snapshot: StarConquestProgressSnapshot
): StarQuest[] {
  const claimed = snapshot.claimed;
  return catalog.map((quest) => {
    const next = cloneStarQuest(quest);
    if (claimed[quest.id]) {
      next.status = 'completed';
      return next;
    }
    if (quest.status === 'locked' && quest.connections.some((id) => claimed[id])) {
      next.status = 'available';
    }
    return next;
  });
}

export function incrementStarConquestFunnel(
  snapshot: StarConquestProgressSnapshot,
  step: StarConquestFunnelStep
): StarConquestProgressSnapshot {
  return {
    version: 1,
    claimed: snapshot.claimed,
    funnel: {
      ...snapshot.funnel,
      [step]: snapshot.funnel[step] + 1,
    },
  };
}

export function claimStarQuest(
  catalog: readonly StarQuest[],
  snapshot: StarConquestProgressSnapshot,
  questId: string,
  claimedAt = Date.now()
): StarConquestClaimResult {
  const hydrated = hydrateStarQuestCatalog(catalog, snapshot);
  const quest = hydrated.find((item) => item.id === questId);
  if (!quest) {
    return { ok: false, reason: 'missing', snapshot };
  }

  const kind = starQuestClaimKind(quest.status);
  if (kind === 'completed') {
    return { ok: false, reason: 'already-claimed', snapshot, quest };
  }
  if (kind === 'locked' || kind === 'future') {
    return { ok: false, reason: kind, snapshot, quest };
  }

  const nextSnapshot: StarConquestProgressSnapshot = {
    version: 1,
    claimed: {
      ...snapshot.claimed,
      [questId]: { claimedAt, rewardM4T3R: quest.rewardM4T3R },
    },
    funnel: {
      ...snapshot.funnel,
      claims: snapshot.funnel.claims + 1,
    },
  };
  const claimedQuest = hydrateStarQuestCatalog(catalog, nextSnapshot).find(
    (item) => item.id === questId
  );
  if (!claimedQuest) {
    return { ok: false, reason: 'missing', snapshot };
  }
  return { ok: true, snapshot: nextSnapshot, quest: claimedQuest };
}

/** Marque des étoiles conquises sans passer par le clic preview (sync Dock). */
export function markStarQuestsClaimed(
  catalog: readonly StarQuest[],
  snapshot: StarConquestProgressSnapshot,
  questIds: readonly string[],
  claimedAt = Date.now()
): StarConquestProgressSnapshot {
  const claimed = { ...snapshot.claimed };
  let claims = snapshot.funnel.claims;
  let changed = false;
  for (const id of questIds) {
    if (claimed[id]) continue;
    const quest = catalog.find((item) => item.id === id);
    if (!quest) continue;
    claimed[id] = { claimedAt, rewardM4T3R: quest.rewardM4T3R };
    claims += 1;
    changed = true;
  }
  if (!changed) return snapshot;
  return {
    version: 1,
    claimed,
    funnel: { ...snapshot.funnel, claims },
  };
}
