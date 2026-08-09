import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';

import { Block, BlockTransaction } from '../../core/models/block.model';
import { ShowcaseTab } from '../../core/models/showcase-tab.model';
import {
  BlockchainApiService,
  BlockchainStats,
  PeerView,
} from '../../core/services/blockchain-api.service';
import { ShowcaseNewsStateService } from '../../core/services/showcase-news-state.service';
import {
  SHOWCASE_REFRESH_EVENT,
  TERMINAL_REFRESH_EVENT,
  refreshEventMatchesTab,
} from '../../core/constants/panel-refresh.constants';

export type TerminalStatusKind = 'confirmed' | 'validated' | 'info' | 'sync';

export interface TerminalRow {
  id: string;
  ref: string;
  time: string;
  action: string;
  status: string;
  statusKind: TerminalStatusKind;
}

@Component({
  selector: 'app-showcase-terminal',
  standalone: true,
  templateUrl: './showcase-terminal.html',
  styleUrls: ['./showcase-terminal.css', './showcase-terminal-reseau.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShowcaseTerminalComponent implements OnInit, OnChanges {
  private static readonly RESEAU_PAGE_SIZE = 10;
  private static readonly DEFAULT_PAGE_SIZE = 5;

  private readonly api = inject(BlockchainApiService);
  private readonly newsState = inject(ShowcaseNewsStateService);
  private readonly destroyRef = inject(DestroyRef);

  @Input({ required: true }) mode: ShowcaseTab = 'tours';
  @Input() expanded = true;

  readonly selectBlock = output<number>();

  readonly loading = signal(true);
  readonly loadingMore = signal(false);
  readonly error = signal<string | null>(null);
  readonly visibleLimit = signal(ShowcaseTerminalComponent.RESEAU_PAGE_SIZE);
  private readonly modeValue = signal<ShowcaseTab>('tours');

  private readonly blocks = signal<Block[]>([]);
  private readonly peers = signal<PeerView[]>([]);
  private readonly stats = signal<BlockchainStats | null>(null);

  readonly headerTitle = computed(() => {
    switch (this.modeValue()) {
      case 'reseau':
        return 'RÉSEAU • NODE';
      case 'rv23':
        return 'R4V3 • CORE';
      case 'peers':
        return 'R4V3 • PEERS';
      case 'dao':
        return 'R4V3 • D.A.O';
      default:
        return 'R4V3 • TERMINAL NODE';
    }
  });

  readonly eventCount = computed(() => this.allRows().length);

  readonly reseauStatusValue = computed(() => {
    const connected = this.peers().filter((peer) => peer.status === 'CONNECTED').length;
    if (connected > 0) {
      return String(connected);
    }

    const blockCount = this.stats()?.totalBlocks ?? this.blocks().length;
    return blockCount > 0 ? String(blockCount) : '0';
  });

  readonly peersStatusValue = computed(() => {
    const connected = this.peers().filter((peer) => peer.status === 'CONNECTED').length;
    return String(connected);
  });

  readonly reseauStatusTooltip = computed(() => {
    const parts: string[] = [];
    const stats = this.stats();
    const blockCount = stats?.totalBlocks ?? this.blocks().length;

    if (blockCount > 0) {
      parts.push(`${blockCount} blocs indexés`);
    }

    const connected = this.peers().filter((peer) => peer.status === 'CONNECTED').length;
    if (this.peers().length > 0) {
      parts.push(`${connected}/${this.peers().length} peers connectés`);
    }

    return parts.join(' · ') || 'État réseau';
  });

  readonly peersStatusTooltip = computed(() => {
    const connectedPeers = this.peers().filter((peer) => peer.status === 'CONNECTED');
    const connected = connectedPeers.length;
    const total = this.peers().length;

    if (total === 0) {
      return 'Aucun peer enregistré';
    }

    if (connected === 0) {
      return `${total} peer${total > 1 ? 's' : ''} · aucun connecté`;
    }

    const names = connectedPeers.map((peer) => this.peerDisplayName(peer)).join(', ');
    return `${connected} peer${connected > 1 ? 's' : ''} connecté${connected > 1 ? 's' : ''} · ${names}`;
  });

  readonly allRows = computed(() => {
    switch (this.modeValue()) {
      case 'reseau':
        return this.buildReseauRows();
      case 'rv23':
        return this.buildRv23Rows();
      case 'peers':
        return this.buildPeersRows();
      case 'dao':
        return this.buildDaoRows();
      default:
        return this.buildToursRows();
    }
  });

  readonly visibleRows = computed(() =>
    this.allRows().slice(0, this.visibleLimit())
  );

  readonly canLoadMore = computed(() => this.visibleLimit() < this.allRows().length);

  ngOnInit(): void {
    this.modeValue.set(this.mode);
    this.visibleLimit.set(this.pageSize());
    void this.refresh();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['mode']) {
      this.modeValue.set(this.mode);
      if (!changes['mode'].firstChange) {
        this.visibleLimit.set(this.pageSize());
      }
    }
  }

  @HostListener(`window:${TERMINAL_REFRESH_EVENT}`)
  @HostListener(`window:${SHOWCASE_REFRESH_EVENT}`, ['$event'])
  onGlobalRefresh(event?: Event): void {
    if (event?.type === SHOWCASE_REFRESH_EVENT) {
      const tab = this.modeValue();
      if (!refreshEventMatchesTab(event, tab)) {
        return;
      }
    }
    void this.refresh();
  }

  async refresh(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const [blocks, peers, stats] = await Promise.all([
        firstValueFrom(this.api.getBlocks()).catch(() => [] as Block[]),
        firstValueFrom(this.api.getPeers()).catch(() => [] as PeerView[]),
        firstValueFrom(this.api.getStats()).catch(() => null),
      ]);

      this.blocks.set(this.sortBlocks(Array.isArray(blocks) ? blocks : []));
      this.peers.set(Array.isArray(peers) ? peers : []);
      this.stats.set(stats);
    } catch {
      this.error.set('Terminal indisponible.');
      this.blocks.set([]);
      this.peers.set([]);
      this.stats.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  loadMore(): void {
    if (!this.canLoadMore() || this.loadingMore()) {
      return;
    }

    this.loadingMore.set(true);
    window.setTimeout(() => {
      this.visibleLimit.update((limit) =>
        Math.min(limit + this.pageSize(), this.allRows().length)
      );
      this.loadingMore.set(false);
    }, 120);
  }

  protected refreshAriaLabel(): string {
    if (this.loading()) {
      return this.modeValue() === 'peers'
        ? 'Actualisation des peers…'
        : 'Actualisation du réseau…';
    }

    return this.modeValue() === 'peers' ? 'Actualiser les peers' : 'Actualiser le réseau';
  }

  protected hubStatusValue(): string {
    return this.modeValue() === 'peers' ? this.peersStatusValue() : this.reseauStatusValue();
  }

  protected hubStatusTooltip(): string {
    return this.modeValue() === 'peers' ? this.peersStatusTooltip() : this.reseauStatusTooltip();
  }

  protected hubEmptyMessage(): string {
    return this.modeValue() === 'peers'
      ? 'Aucun peer disponible pour le moment.'
      : 'Aucun événement réseau pour le moment.';
  }

  protected hubAriaLabel(): string {
    return this.modeValue() === 'peers' ? 'Peers connectés' : 'Réseau blockchain';
  }

  protected hubLedDim(): boolean {
    if (this.modeValue() !== 'peers') {
      return false;
    }

    return this.peers().filter((peer) => peer.status === 'CONNECTED').length === 0;
  }

  protected rowTagIcon(row: TerminalRow): string {
    switch (row.statusKind) {
      case 'sync':
        return '⛓';
      case 'validated':
        return '✓';
      case 'confirmed':
        return '●';
      case 'info':
        return 'ℹ';
    }
  }

  protected rowTagLabel(row: TerminalRow): string {
    return row.status;
  }

  onRowClick(row: TerminalRow): void {
    const blockIndex = this.resolveBlockIndex(row);
    if (blockIndex == null) {
      return;
    }

    this.selectBlock.emit(blockIndex);
  }

  private resolveBlockIndex(row: TerminalRow): number | null {
    const blockMatch = row.ref.match(/^#(\d+)$/);
    if (blockMatch) {
      return Number.parseInt(blockMatch[1], 10);
    }

    const blockFromId = row.id.match(/^block-(\d+)$/);
    if (blockFromId) {
      return Number.parseInt(blockFromId[1], 10);
    }

    return null;
  }

  private buildToursRows(): TerminalRow[] {
    const rows: TerminalRow[] = [];

    for (const block of this.blocks()) {
      rows.push({
        id: `block-${block.index}`,
        ref: `#${block.index}`,
        time: this.formatTime(block.timestamp),
        action: `Bloc #${block.index} miné avec succès`,
        status: 'CONFIRMÉ',
        statusKind: 'confirmed',
      });

      const txs = block.transactions ?? [];
      for (const tx of txs.slice(0, 2)) {
        rows.push(this.txRow(block.index, tx));
      }
    }

    return rows.slice(0, 24);
  }

  private buildReseauRows(): TerminalRow[] {
    const stats = this.stats();
    const rows: TerminalRow[] = [
      {
        id: 'net-sync',
        ref: '#NET',
        time: this.formatTime(Date.now()),
        action: stats
          ? `Synchronisation réseau • ${stats.totalBlocks ?? this.blocks().length} blocs`
          : 'Synchronisation réseau en cours',
        status: 'SYNC',
        statusKind: 'sync',
      },
    ];

    for (const block of this.blocks()) {
      rows.push({
        id: `net-${block.index}`,
        ref: `#${block.index}`,
        time: this.formatTime(block.timestamp),
        action: `Propagation bloc #${block.index} • ${this.shortHash(block.hash)}`,
        status: 'VALIDÉ',
        statusKind: 'validated',
      });
    }

    return rows;
  }

  private buildRv23Rows(): TerminalRow[] {
    const live = this.newsState.liveActivity() || 'R4V3 mainnet actif';
    return [
      {
        id: 'rv23-live',
        ref: '#RV3',
        time: this.formatTime(Date.now()),
        action: live,
        status: 'INFO',
        statusKind: 'info',
      },
      {
        id: 'rv23-chain',
        ref: `#${this.blocks()[0]?.index ?? 0}`,
        time: this.formatTime(this.blocks()[0]?.timestamp ?? Date.now()),
        action: `Tip R4V3 • ${this.shortHash(this.blocks()[0]?.hash)}`,
        status: 'SYNC',
        statusKind: 'sync',
      },
      ...this.buildToursRows().slice(0, 4),
    ];
  }

  private buildPeersRows(): TerminalRow[] {
    return this.peers().map((peer, index) => ({
      id: `peer-${peer.url}-${index}`,
      ref: `#P${index + 1}`,
      time: this.formatTime(Date.now()),
      action: `${this.peerDisplayName(peer)} · ${peer.url}`,
      status: peer.status === 'CONNECTED' ? 'CONNECTÉ' : peer.status,
      statusKind: peer.status === 'CONNECTED' ? 'validated' : 'info',
    }));
  }

  private buildDaoRows(): TerminalRow[] {
    const headlines = this.newsState.feedItems();
    if (!headlines.length) {
      return [
        {
          id: 'dao-empty',
          ref: '#DAO',
          time: this.formatTime(Date.now()),
          action: 'Aucune proposition D.A.O active',
          status: 'INFO',
          statusKind: 'info',
        },
      ];
    }

    return headlines.slice(0, 10).map((item, index) => ({
      id: `dao-${item.id ?? index}`,
      ref: `#${index + 1}`,
      time: this.formatTime(Date.now()),
      action: item.title,
      status: item.featured ? 'SYNC' : 'INFO',
      statusKind: item.featured ? 'sync' : 'info',
    }));
  }

  private txRow(blockIndex: number, tx: BlockTransaction): TerminalRow {
    const shortTx = this.shortHash(tx.id || tx.signature, 4);
    return {
      id: `tx-${blockIndex}-${shortTx}`,
      ref: `#${blockIndex}`,
      time: this.formatTime(tx.timestamp),
      action: `Validation de TX • 0x${shortTx}`,
      status: 'VALIDÉ',
      statusKind: 'validated',
    };
  }

  private sortBlocks(blocks: Block[]): Block[] {
    return [...blocks].sort((a, b) => b.index - a.index);
  }

  private formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
      return '—';
    }
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  }

  private shortHash(value: string | null | undefined, size = 4): string {
    if (!value) {
      return '—';
    }
    if (value.length <= size * 2) {
      return value;
    }
    return `${value.slice(0, size)}…${value.slice(-size)}`;
  }

  private pageSize(): number {
    return this.modeValue() === 'reseau' || this.modeValue() === 'peers'
      ? ShowcaseTerminalComponent.RESEAU_PAGE_SIZE
      : ShowcaseTerminalComponent.DEFAULT_PAGE_SIZE;
  }

  private peerDisplayName(peer: PeerView): string {
    try {
      const parsed = new URL(peer.url);
      const host = parsed.hostname.replace(/^www\./i, '');
      const label = host.split('.')[0] || host;
      return label || peer.url;
    } catch {
      const cleaned = peer.url.replace(/^https?:\/\//i, '').split('/')[0] ?? peer.url;
      return cleaned.length > 18 ? `${cleaned.slice(0, 14)}…` : cleaned;
    }
  }
}
