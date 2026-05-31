import {
  Component,
  HostListener,
  OnInit,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { DatePipe, CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';

import { Block } from '../../core/models/block.model';
import {
  BlockchainApiService,
  BlockchainStats,
} from '../../core/services/blockchain-api.service';

@Component({
  selector: 'app-blocks-list',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './blocks-list.html',
  styleUrls: ['./blocks-list.css'],
})
export class BlocksListComponent implements OnInit {
  private readonly api = inject(BlockchainApiService);

  readonly blocks = signal<Block[]>([]);
  readonly stats = signal<BlockchainStats | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly searchQuery = signal('');

  readonly blockCount = computed(() => this.blocks().length);
  readonly hasBlocks = computed(() => this.blockCount() > 0);

  readonly filteredBlocks = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const items = this.blocks();

    if (!query) {
      return items;
    }

    return items.filter((block) => {
      const haystack = [
        block.index,
        block.hash,
        block.previousHash,
        block.data,
        this.blockTxCount(block),
      ]
        .filter((value) => value !== null && value !== undefined)
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  });

  readonly filteredBlockCount = computed(() => this.filteredBlocks().length);
  readonly hasFilteredBlocks = computed(() => this.filteredBlockCount() > 0);
  readonly visibleBlocks = computed(() => this.filteredBlocks().slice(0, 8));
  readonly latestBlock = computed(() => this.blocks()[0] ?? null);

  readonly chainStatusLabel = computed(() => {
    if (this.loading()) {
      return 'Sync…';
    }

    if (this.error()) {
      return 'Erreur sync';
    }

    if (!this.hasBlocks()) {
      return 'Chaîne vide';
    }

    const chainStats = this.stats();
    if (chainStats?.totalBlocks) {
      return `${chainStats.totalBlocks} blocs · synced`;
    }

    const tip = this.latestBlock();
    return tip ? `Tip #${tip.index}` : 'Synced';
  });

  readonly selectBlock = output<Block>();

  ngOnInit(): void {
    void this.loadBlocks();
    void this.loadStats();
  }

  @HostListener('window:naivechain-refresh')
  onGlobalRefresh(): void {
    void this.loadBlocks();
    void this.loadStats();
  }

  refresh(): void {
    void this.loadBlocks();
    void this.loadStats();
  }

  onSearchInput(value: string): void {
    this.searchQuery.set(value);
  }

  clearSearch(): void {
    this.searchQuery.set('');
  }

  async copyHash(hash?: string | null): Promise<void> {
    if (!hash) {
      return;
    }

    try {
      await navigator.clipboard.writeText(hash);
    } catch {
      // ignore clipboard errors in compact dock
    }
  }

  async loadBlocks(): Promise<void> {
    if (this.loading()) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    try {
      const response = await firstValueFrom(this.api.getBlocks());
      const nextBlocks = Array.isArray(response) ? response : [];
      this.blocks.set(this.sortBlocks(nextBlocks));
    } catch (error) {
      console.error(error);
      this.blocks.set([]);
      this.error.set('Impossible de charger la blockchain.');
    } finally {
      this.loading.set(false);
    }
  }

  async loadStats(): Promise<void> {
    try {
      const response = await firstValueFrom(this.api.getStats());
      this.stats.set(response);
    } catch {
      this.stats.set(null);
    }
  }

  openBlock(block: Block): void {
    this.selectBlock.emit(block);
  }

  blockTxCount(block: Block): number {
    return block.transactions?.length ?? 0;
  }

  shortHash(hash: string | null | undefined, size = 8): string {
    if (!hash) {
      return 'N/A';
    }

    if (hash.length <= size * 2) {
      return hash;
    }

    return `${hash.slice(0, size)}…${hash.slice(-size)}`;
  }

  shortData(value: string | null | undefined, max = 68): string {
    if (!value || !value.trim()) {
      return 'Aucune donnée';
    }

    const normalized = value.replace(/\s+/g, ' ').trim();

    if (normalized.length <= max) {
      return normalized;
    }

    return `${normalized.slice(0, max).trimEnd()}…`;
  }

  private sortBlocks(blocks: Block[]): Block[] {
    return [...blocks].sort((a, b) => b.index - a.index);
  }
}
