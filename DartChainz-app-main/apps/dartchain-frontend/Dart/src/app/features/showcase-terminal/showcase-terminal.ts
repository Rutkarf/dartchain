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
  styleUrls: ['./showcase-terminal.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShowcaseTerminalComponent implements OnInit, OnChanges {
  private readonly api = inject(BlockchainApiService);
  private readonly newsState = inject(ShowcaseNewsStateService);
  private readonly destroyRef = inject(DestroyRef);

  @Input({ required: true }) mode: ShowcaseTab = 'tours';
  @Input() expanded = true;

  readonly selectBlock = output<number>();

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly visibleLimit = signal(5);
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
    void this.refresh();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['mode']) {
      this.modeValue.set(this.mode);
      if (!changes['mode'].firstChange) {
        this.visibleLimit.set(5);
      }
    }
  }

  @HostListener('window:naivechain-refresh')
  onGlobalRefresh(): void {
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
    this.visibleLimit.update((limit) => Math.min(limit + 5, this.allRows().length));
  }

  onRowClick(row: TerminalRow): void {
    const index = Number.parseInt(row.ref.replace('#', ''), 10);
    if (Number.isFinite(index)) {
      this.selectBlock.emit(index);
    }
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

    for (const block of this.blocks().slice(0, 6)) {
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
    const peerItems = this.peers();
    if (!peerItems.length) {
      return [
        {
          id: 'peer-empty',
          ref: '#P0',
          time: this.formatTime(Date.now()),
          action: 'Aucun peer connecté pour le moment',
          status: 'INFO',
          statusKind: 'info',
        },
      ];
    }

    return peerItems.slice(0, 12).map((peer, index) => ({
      id: `peer-${index}`,
      ref: `#P${index + 1}`,
      time: this.formatTime(Date.now()),
      action: `${peer.url} • ${peer.status}`,
      status: peer.status === 'CONNECTED' ? 'VALIDÉ' : 'INFO',
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
}
