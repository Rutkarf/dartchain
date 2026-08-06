import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval, startWith, switchMap } from 'rxjs';
import { catchError, of } from 'rxjs';

import { BrandCryptoSelectionService } from './brand-crypto-selection.service';
import { BlockchainApiService, PendingTransaction } from './blockchain-api.service';
import { DockChainStateService } from './dock-chain-state.service';
import { formatDockRelativeTime } from '../utils/dock-time.util';

export interface NavbarTickerDrawerDetail {
  eyebrow: string;
  title: string;
  summary: string;
  bullets?: string[];
  metrics?: { label: string; value: string }[];
}

export interface NavbarTickerSegment {
  id: string;
  label: string;
  value: string;
  detail?: NavbarTickerDrawerDetail;
}

@Injectable({ providedIn: 'root' })
export class NavbarTickerStateService {
  private readonly api = inject(BlockchainApiService);
  private readonly brandCrypto = inject(BrandCryptoSelectionService);
  private readonly chainState = inject(DockChainStateService);

  readonly networkLabel = signal('DARTCHAIN');
  readonly activeToken = signal('R4V3');
  readonly lastTransactionShort = signal('Chargement…');
  readonly peersConnected = signal(0);
  readonly peersTotal = signal(0);
  readonly blockTip = signal<string | null>(null);
  readonly lastUpdatedAt = signal<number | null>(null);
  readonly loading = signal(true);

  readonly segments = computed((): NavbarTickerSegment[] => {
    const peersLabel =
      this.peersTotal() > 0
        ? `${this.peersConnected()}/${this.peersTotal()}`
        : String(this.peersConnected());

    const networkValue = this.networkLabel();
    const tokenValue = this.activeToken();
    const txValue = this.lastTransactionShort();
    const tip = this.blockTip();
    const ageLabel = this.updatedAgeLabel();

    const segments: NavbarTickerSegment[] = [
      {
        id: 'network',
        label: 'Net',
        value: networkValue,
        detail: {
          eyebrow: 'Infrastructure',
          title: networkValue,
          summary:
            'DartChain s’appuie sur un réseau distribué optimisé pour la latence et la disponibilité des nœuds.',
          bullets: [
            'Consensus synchronisé en temps réel avec les pairs actifs.',
            'Launch prévu Q4 — accès anticipé via le LaunchLab R4V3.',
            'Compatible avec les flux live WebSocket de l’explorateur.',
          ],
          metrics: [
            { label: 'Réseau', value: 'DartChain P2P' },
            { label: 'Statut', value: this.loading() ? 'Synchronisation…' : 'Opérationnel' },
            { label: 'Mise à jour', value: ageLabel },
          ],
        },
      },
      {
        id: 'token',
        label: 'Token',
        value: tokenValue,
        detail: {
          eyebrow: 'Actif sélectionné',
          title: tokenValue,
          summary:
            'Le token actif pilote le graphique, l’échange et les métriques affichées dans le hub marché.',
          bullets: [
            'R4V3 — jeton natif de l’écosystème DartChain.',
            'Tokens LaunchLab disponibles dans le menu déroulant adjacent.',
            'Rewards distribués aux participants actifs du réseau.',
          ],
          metrics: [
            { label: 'TVL', value: '12.4M' },
            { label: 'Launch', value: 'Q4 2026' },
            { label: 'Rewards', value: 'Actifs' },
          ],
        },
      },
      {
        id: 'tx',
        label: 'Tx',
        value: txValue,
        detail: {
          eyebrow: 'Mempool',
          title: 'Dernière transaction',
          summary:
            'Flux des transactions en attente de validation, mis à jour via le canal live du nœud.',
          bullets: [
            'Hash tronqué dans le ticker pour la lisibilité compacte.',
            'Ouvrez le dock Transactions pour l’historique complet.',
            'Rafraîchissement automatique à chaque snapshot réseau.',
          ],
          metrics: [{ label: 'Hash', value: txValue }],
        },
      },
      {
        id: 'peers',
        label: 'Peers',
        value: peersLabel,
        detail: {
          eyebrow: 'Topologie P2P',
          title: `${peersLabel} pairs`,
          summary:
            'Nombre de nœuds connectés au réseau DartChain, mesuré via les statistiques peers du backend.',
          bullets: [
            'Les pairs actifs contribuent à la propagation des blocs.',
            'Consultez le dock Peers pour le détail de chaque connexion.',
            'Actualisation automatique toutes les 30 secondes.',
          ],
          metrics: [
            { label: 'Connectés', value: String(this.peersConnected()) },
            { label: 'Total', value: String(this.peersTotal() || this.peersConnected()) },
            { label: 'Mise à jour', value: ageLabel },
          ],
        },
      },
    ];

    if (tip) {
      segments.push({
        id: 'tip',
        label: 'Bloc',
        value: tip,
        detail: {
          eyebrow: 'Chaîne',
          title: `Bloc ${tip}`,
          summary:
            'Index du dernier bloc confirmé sur la chaîne DartChain, rafraîchi toutes les 5 secondes.',
          bullets: [
            'Pointe de chaîne synchronisée avec le dock Chain.',
            'Cliquez sur un bloc dans l’explorateur pour ouvrir le détail.',
            'Indicateur de progression du nœud local.',
          ],
          metrics: [{ label: 'Tip', value: tip }],
        },
      });
    }

    return segments;
  });

  readonly updatedAgeLabel = computed(() =>
    formatDockRelativeTime(this.lastUpdatedAt())
  );

  constructor() {
    effect(() => {
      this.activeToken.set(String(this.brandCrypto.selected()));
    });

    this.fetchBanner();
    this.listenLiveUpdates();

    interval(30_000)
      .pipe(
        startWith(0),
        switchMap(() => this.api.getPeerStats()),
        catchError(() => of(null)),
        takeUntilDestroyed()
      )
      .subscribe((stats) => {
        if (stats) {
          this.peersConnected.set(stats.active ?? 0);
          this.peersTotal.set(stats.total ?? stats.active ?? 0);
          this.lastUpdatedAt.set(Date.now());
        }
      });

    void this.chainState.load();
    interval(45_000)
      .pipe(startWith(0), takeUntilDestroyed())
      .subscribe(() => this.chainState.refresh());

    interval(5_000)
      .pipe(startWith(0), takeUntilDestroyed())
      .subscribe(() => {
        const tip = this.chainState.latestBlock();
        this.blockTip.set(tip ? `#${tip.index}` : null);
      });
  }

  refresh(): void {
    this.fetchBanner();
    this.chainState.refresh(true);
  }

  private fetchBanner(): void {
    this.loading.set(true);
    this.api
      .getBanner()
      .pipe(catchError(() => of(null)))
      .subscribe((data) => {
        if (data) {
          this.networkLabel.set(data.message1?.trim() || 'DARTCHAIN');
          this.applyLatestTransactionLabel(
            data.lastTransactionShort ?? data.lastTransaction ?? null
          );
          if (typeof data.userCount === 'number' && data.userCount >= 0) {
            this.peersConnected.set(data.userCount);
          }
        } else {
          this.networkLabel.set('DARTCHAIN');
          this.lastTransactionShort.set('Aucune transaction récente');
        }
        this.loading.set(false);
        this.lastUpdatedAt.set(Date.now());
      });
  }

  private listenLiveUpdates(): void {
    this.api.connectLiveUpdates().pipe(takeUntilDestroyed()).subscribe({
      next: (message) => {
        if (message.type === 'pending-transactions') {
          this.applyLatestTransaction(message.data);
        }
        if (message.type === 'snapshot') {
          this.applyLatestTransaction(message.data.pendingTransactions);
        }
        this.lastUpdatedAt.set(Date.now());
      },
    });
  }

  private applyLatestTransaction(transactions: PendingTransaction[]): void {
    if (!transactions?.length) {
      this.lastTransactionShort.set('Aucune transaction récente');
      return;
    }

    const latest = [...transactions].sort(
      (a, b) => (b.createdAt ?? b.timestamp ?? 0) - (a.createdAt ?? a.timestamp ?? 0)
    )[0];

    const hash =
      latest.hash ??
      latest.id ??
      latest.payload ??
      latest.data ??
      'Transaction';

    this.applyLatestTransactionLabel(hash);
  }

  private applyLatestTransactionLabel(value: string | null): void {
    if (!value?.trim()) {
      this.lastTransactionShort.set('Aucune transaction récente');
      return;
    }

    const normalized = value.trim();
    this.lastTransactionShort.set(
      normalized.length > 24 ? `${normalized.slice(0, 24)}…` : normalized
    );
  }
}
