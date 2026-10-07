import { Injectable, computed, signal } from '@angular/core';

export type ArenaGameMode = 'ffa-bots' | 'horde' | 'duel-bots' | 'ffa-peers';

export interface ArenaLeaderRow {
  name: string;
  kills: number;
  deaths: number;
  streak: number;
  earned: number;
}

export interface ArenaPowerUpState {
  id: string;
  kind: 'shield' | 'double-loot';
  x: number;
  z: number;
  activeUntil: number;
}

const MODE_KEY = 'arena-bb-mode-v1';
const QUEST_KEY = 'arena-bb-quest-kills-v1';
const QUEST_CLAIMED_KEY = 'arena-bb-quest-claimed-v1';
const QUEST_TARGET = 3;
const QUEST_REWARD_FAUCET = 25;

/**
 * Méta Éliminer pour gagner : streak, waves, quête dock ledger, earnings session.
 */
@Injectable({ providedIn: 'root' })
export class ArenaMetaService {
  private readonly modeSignal = signal<ArenaGameMode>(this.readMode());
  private readonly streakSignal = signal(0);
  private readonly bestStreakSignal = signal(0);
  private readonly pauseSignal = signal(false);
  /** Age gate retiré — jouable dès l’arrivée hub (plus de modal 21+). */
  private readonly ageOkSignal = signal(true);
  private readonly killCamUntilSignal = signal(0);
  private readonly freezeUntilSignal = signal(0);
  private readonly powerUpsSignal = signal<ArenaPowerUpState[]>([]);
  private readonly skinSignal = signal<'cyan' | 'r4v3' | 'pxd'>('cyan');
  private readonly roomSignal = signal('default');
  private readonly doubleLootUntilSignal = signal(0);
  private readonly sessionEarnedSignal = signal(0);
  private readonly waveSignal = signal(1);
  /** Incrémenté à chaque setMode — combat / transport rebuild. */
  private readonly modeEpochSignal = signal(0);
  private readonly leaderSignal = signal<ArenaLeaderRow[]>([
    { name: 'Guest', kills: 0, deaths: 0, streak: 0, earned: 0 },
  ]);
  private readonly questKillsSignal = signal(this.readQuestKills());
  private readonly questClaimedSignal = signal(this.readQuestClaimed());

  readonly mode = this.modeSignal.asReadonly();
  readonly streak = this.streakSignal.asReadonly();
  readonly bestStreak = this.bestStreakSignal.asReadonly();
  readonly paused = this.pauseSignal.asReadonly();
  readonly ageOk = this.ageOkSignal.asReadonly();
  readonly killCamUntil = this.killCamUntilSignal.asReadonly();
  readonly freezeUntil = this.freezeUntilSignal.asReadonly();
  readonly powerUps = this.powerUpsSignal.asReadonly();
  readonly skin = this.skinSignal.asReadonly();
  readonly roomId = this.roomSignal.asReadonly();
  readonly leaderboard = this.leaderSignal.asReadonly();
  readonly questKills = this.questKillsSignal.asReadonly();
  readonly questClaimed = this.questClaimedSignal.asReadonly();
  readonly sessionEarned = this.sessionEarnedSignal.asReadonly();
  readonly wave = this.waveSignal.asReadonly();
  readonly modeEpoch = this.modeEpochSignal.asReadonly();
  readonly questTarget = QUEST_TARGET;
  readonly questReward = QUEST_REWARD_FAUCET;

  readonly lootMultiplier = computed(() => {
    if (performance.now() < this.doubleLootUntilSignal()) return 2.5;
    const s = this.streakSignal();
    if (s >= 7) return 2.5;
    if (s >= 5) return 2;
    if (s >= 3) return 1.5;
    return 1;
  });

  readonly questProgressLabel = computed(() => {
    const k = Math.min(this.questKillsSignal(), QUEST_TARGET);
    if (this.questClaimedSignal()) {
      return `Quête dock : claimée (+${QUEST_REWARD_FAUCET} ƒ ledger)`;
    }
    return `Quête dock : ${k}/${QUEST_TARGET} KO → +${QUEST_REWARD_FAUCET} ƒ`;
  });

  readonly questComplete = computed(
    () => this.questKillsSignal() >= QUEST_TARGET && !this.questClaimedSignal()
  );

  readonly kteTagline = computed(() => {
    const e = this.sessionEarnedSignal();
    const s = this.streakSignal();
    if (s >= 3) return `Streak ×${s} · +${e} ƒ session`;
    return `+${e} ƒ session`;
  });

  acceptAgeGate(): void {
    this.ageOkSignal.set(true);
  }

  setMode(mode: ArenaGameMode): void {
    this.modeSignal.set(mode);
    this.waveSignal.set(1);
    this.modeEpochSignal.update((n) => n + 1);
    try {
      localStorage.setItem(MODE_KEY, mode);
    } catch {
      /* ignore */
    }
  }

  setSkin(skin: 'cyan' | 'r4v3' | 'pxd'): void {
    this.skinSignal.set(skin);
  }

  setRoom(roomId: string): void {
    this.roomSignal.set(roomId.trim() || 'default');
  }

  setPaused(paused: boolean): void {
    this.pauseSignal.set(paused);
  }

  bumpWave(): void {
    this.waveSignal.update((w) => w + 1);
  }

  registerKill(playerName: string, lootAmount: number): void {
    const next = this.streakSignal() + 1;
    this.streakSignal.set(next);
    this.bestStreakSignal.update((b) => Math.max(b, next));
    this.killCamUntilSignal.set(performance.now() + 1400);
    this.freezeUntilSignal.set(performance.now() + 220);
    this.sessionEarnedSignal.update((e) => e + Math.max(0, lootAmount));
    this.bumpLeader(playerName, 1, 0, next, lootAmount);
    const q = this.questKillsSignal() + 1;
    this.questKillsSignal.set(q);
    try {
      localStorage.setItem(QUEST_KEY, String(q));
    } catch {
      /* ignore */
    }
  }

  registerDeath(playerName: string): void {
    this.streakSignal.set(0);
    this.bumpLeader(playerName, 0, 1, 0, 0);
  }

  clearKillCam(): void {
    this.killCamUntilSignal.set(0);
  }

  isFrozen(): boolean {
    return performance.now() < this.freezeUntilSignal();
  }

  /**
   * Claim quête dock → crédit ledger arène (jamais wallet).
   * @returns montant crédité ou 0
   */
  claimDockQuest(): number {
    if (this.questKillsSignal() < QUEST_TARGET || this.questClaimedSignal()) {
      return 0;
    }
    this.questClaimedSignal.set(true);
    try {
      localStorage.setItem(QUEST_CLAIMED_KEY, '1');
    } catch {
      /* ignore */
    }
    this.sessionEarnedSignal.update((e) => e + QUEST_REWARD_FAUCET);
    return QUEST_REWARD_FAUCET;
  }

  /** Respawn power-ups rares — max 1 au sol. */
  seedPowerUps(around: { x: number; z: number }): void {
    const now = performance.now();
    const kind: 'shield' | 'double-loot' = Math.random() > 0.45 ? 'double-loot' : 'shield';
    const angle = Math.random() * Math.PI * 2;
    const dist = 4 + Math.random() * 3;
    this.powerUpsSignal.set([
      {
        id: `pu-${kind}`,
        kind,
        x: around.x + Math.cos(angle) * dist,
        z: around.z + Math.sin(angle) * dist,
        activeUntil: now + 28_000,
      },
    ]);
  }

  maybeRespawnPowerUp(around: { x: number; z: number }): void {
    const list = this.powerUpsSignal();
    const now = performance.now();
    const alive = list.filter((p) => p.activeUntil > now);
    if (alive.length > 0) {
      if (alive.length !== list.length) this.powerUpsSignal.set(alive);
      return;
    }
    // ~1 spawn / 12 s max (pas de spam sol).
    if (Math.random() < 0.0014) {
      this.seedPowerUps(around);
    }
  }

  mockClaimNotice(): string {
    return 'La réclamation sur la chaîne est hors arène. Ici : registre éliminer-pour-gagner (jetons du robinet non réclamés).';
  }

  tryPickup(x: number, z: number): ArenaPowerUpState | null {
    const list = this.powerUpsSignal();
    const now = performance.now();
    const hit = list.find(
      (p) => p.activeUntil > now && Math.hypot(p.x - x, p.z - z) < 1.35
    );
    if (!hit) return null;
    this.powerUpsSignal.set(list.filter((p) => p.id !== hit.id));
    if (hit.kind === 'double-loot') {
      this.doubleLootUntilSignal.set(now + 18_000);
    }
    return hit;
  }

  private bumpLeader(
    name: string,
    kills: number,
    deaths: number,
    streak: number,
    earned: number
  ): void {
    const rows = [...this.leaderSignal()];
    const idx = rows.findIndex((r) => r.name === name);
    if (idx < 0) {
      rows.push({ name, kills, deaths, streak, earned });
    } else {
      rows[idx] = {
        ...rows[idx],
        kills: rows[idx].kills + kills,
        deaths: rows[idx].deaths + deaths,
        streak: Math.max(rows[idx].streak, streak),
        earned: rows[idx].earned + earned,
      };
    }
    rows.sort((a, b) => b.earned - a.earned || b.kills - a.kills);
    this.leaderSignal.set(rows.slice(0, 8));
  }

  private readMode(): ArenaGameMode {
    try {
      const v = localStorage.getItem(MODE_KEY);
      if (v === 'horde' || v === 'duel-bots' || v === 'ffa-bots' || v === 'ffa-peers') {
        return v;
      }
    } catch {
      /* ignore */
    }
    return 'ffa-bots';
  }

  private readQuestKills(): number {
    try {
      return Number(localStorage.getItem(QUEST_KEY) ?? '0') || 0;
    } catch {
      return 0;
    }
  }

  private readQuestClaimed(): boolean {
    try {
      return localStorage.getItem(QUEST_CLAIMED_KEY) === '1';
    } catch {
      return false;
    }
  }
}
