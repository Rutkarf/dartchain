import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { ArenaSessionService } from '../../services/arena-session.service';
import { ArenaCombatService } from '../../services/arena-combat.service';
import { ArenaAudioService } from '../../services/arena-audio.service';
import {
  ArenaMetaService,
  type ArenaGameMode,
} from '../../services/arena-meta.service';
import { ArenaTelemetryService } from '../../services/arena-telemetry.service';
import {
  ARENA_WEAPON_UI_NAME,
} from '../../models/game-balance.config';

@Component({
  selector: 'app-arena-hud',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  templateUrl: './arena-hud.component.html',
  styleUrl: './arena-hud.component.css',
})
export class ArenaHudComponent implements OnInit {
  private readonly session = inject(ArenaSessionService);
  private readonly combat = inject(ArenaCombatService);
  private readonly audio = inject(ArenaAudioService);
  private readonly meta = inject(ArenaMetaService);
  private readonly telemetry = inject(ArenaTelemetryService);

  readonly enabled = this.session.enabled;
  readonly phase = this.session.phase;
  readonly local = this.session.localPlayer;
  readonly lastLoot = this.session.lastLoot;
  readonly notice = this.session.notice;
  readonly disclaimer = this.session.disclaimer;
  readonly weaponName = ARENA_WEAPON_UI_NAME;
  readonly hitFlash = this.combat.hitFlash;
  readonly lastShot = this.combat.lastShot;
  readonly lockedTarget = this.combat.lockedTarget;
  readonly minimapDots = this.combat.minimapDots;
  readonly screenFlash = this.combat.screenFlash;
  readonly transportMode = this.session.transportMode;

  readonly muted = this.audio.muted;
  readonly streak = this.meta.streak;
  readonly paused = this.meta.paused;
  readonly mode = this.meta.mode;
  readonly skin = this.meta.skin;
  readonly roomId = this.meta.roomId;
  readonly leaderboard = this.meta.leaderboard;
  readonly questLabel = this.meta.questProgressLabel;
  readonly questComplete = this.meta.questComplete;
  readonly questReward = this.meta.questReward;
  readonly lootMult = this.meta.lootMultiplier;
  readonly sessionEarned = this.meta.sessionEarned;
  readonly wave = this.meta.wave;
  readonly kteTagline = this.meta.kteTagline;
  readonly killCamActive = computed(() => this.meta.killCamUntil() > performance.now());
  readonly accuracy = computed(() => this.telemetry.accuracyPct());

  readonly claimToast = signal<string | null>(null);
  readonly roomDraft = signal('default');

  readonly healthPct = computed(() => {
    const p = this.local();
    if (!p || p.maxHealth <= 0) return 0;
    return Math.round((p.health / p.maxHealth) * 100);
  });

  readonly targetCount = computed(() => {
    void this.phase();
    void this.local();
    return this.session
      .remotePlayers()
      .filter((r) => r.status === 'alive' && r.userId.startsWith('bot-')).length;
  });

  readonly peerCount = computed(() => {
    void this.phase();
    void this.local();
    return this.session
      .remotePlayers()
      .filter((r) => r.status === 'alive' && !r.userId.startsWith('bot-')).length;
  });

  readonly title = 'MetaVerseBB';
  readonly shotLabel = computed(() => {
    const s = this.lastShot();
    if (s === 'hit') return 'HIT';
    if (s === 'kill') return 'KO';
    if (s === 'miss') return '—';
    return '';
  });

  ngOnInit(): void {
    this.session.ensureAutoPlay();
  }

  fire(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.combat.tryFire();
  }

  openRulesBrief(): void {
    this.session.openRules();
  }

  dismissRules(): void {
    this.session.dismissRules();
    this.session.ensureAutoPlay();
  }

  respawn(): void {
    void this.session.respawnLocal();
  }

  toggleMute(): void {
    this.audio.toggleMute();
  }

  togglePause(): void {
    this.meta.setPaused(!this.meta.paused());
  }

  setMode(mode: ArenaGameMode): void {
    this.meta.setMode(mode);
  }

  setSkin(skin: 'cyan' | 'r4v3' | 'pxd'): void {
    this.meta.setSkin(skin);
  }

  applyRoom(): void {
    this.meta.setRoom(this.roomDraft());
  }

  onRoomInput(event: Event): void {
    const v = (event.target as HTMLInputElement).value;
    this.roomDraft.set(v);
  }

  claimQuest(): void {
    const amount = this.session.claimDockQuestReward();
    if (amount > 0) {
      this.audio.play('earn');
      this.claimToast.set(`+${amount} ƒ quête dock`);
      window.setTimeout(() => this.claimToast.set(null), 2800);
    }
  }

  showClaimMock(): void {
    this.claimToast.set(this.meta.mockClaimNotice());
    window.setTimeout(() => this.claimToast.set(null), 3200);
  }
}
