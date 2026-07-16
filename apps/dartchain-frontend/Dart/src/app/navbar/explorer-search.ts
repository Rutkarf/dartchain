import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  inject,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  Subject,
  catchError,
  debounceTime,
  distinctUntilChanged,
  of,
  switchMap,
  take,
  tap,
} from 'rxjs';

import { Block } from '../core/models/block.model';
import {
  ExplorerSearchResult,
  ExplorerSearchResponse,
} from '../core/models/explorer-search.model';
import { BlockchainApiService } from '../core/services/blockchain-api.service';

@Component({
  selector: 'app-explorer-search',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './explorer-search.html',
  styleUrl: './explorer-search.css',
})
export class ExplorerSearchComponent {
  static readonly PLACEHOLDER_TEXT = 'Explore Block, Hash, ...';

  private readonly api = inject(BlockchainApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly selectBlock = output<Block>();
  readonly openPending = output<void>();

  readonly placeholderText = ExplorerSearchComponent.PLACEHOLDER_TEXT;
  readonly inputFocused = signal(false);
  readonly query = signal('');
  readonly results = signal<ExplorerSearchResult[]>([]);
  readonly loading = signal(false);
  readonly menuOpen = signal(false);
  readonly errorMessage = signal<string | null>(null);

  private readonly search$ = new Subject<string>();

  constructor() {
    this.search$
      .pipe(
        debounceTime(280),
        distinctUntilChanged(),
        tap((value) => {
          if (!value.trim()) {
            this.results.set([]);
            this.loading.set(false);
            this.errorMessage.set(null);
          } else {
            this.loading.set(true);
            this.errorMessage.set(null);
          }
        }),
        switchMap((value) => {
          const trimmed = value.trim();
          if (!trimmed) {
            return of({ query: '', results: [] } satisfies ExplorerSearchResponse);
          }

          return this.api.searchExplorer(trimmed).pipe(
            catchError(() => {
              this.errorMessage.set('Recherche indisponible.');
              return of({ query: trimmed, results: [] } satisfies ExplorerSearchResponse);
            })
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((response) => {
        this.results.set(response.results);
        this.loading.set(false);
        this.menuOpen.set(response.query.trim().length > 0);
      });
  }

  onInput(value: string): void {
    this.query.set(value);
    this.search$.next(value);
    this.menuOpen.set(value.trim().length > 0);
  }

  onInputFocus(): void {
    this.inputFocused.set(true);
    this.onFocus();
  }

  onInputBlur(): void {
    this.inputFocused.set(false);
  }

  onFocus(): void {
    if (this.query().trim()) {
      this.menuOpen.set(true);
    }
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    const first = this.results()[0];
    if (first) {
      this.activateResult(first);
    }
  }

  activateResult(result: ExplorerSearchResult): void {
    if (result.kind === 'PENDING') {
      this.menuOpen.set(false);
      this.openPending.emit();
      return;
    }

    if (result.blockIndex != null) {
      this.api
        .getBlocks()
        .pipe(take(1))
        .subscribe((blocks) => {
          const block =
            blocks.find((item) => item.index === result.blockIndex) ??
            (result.blockHash
              ? blocks.find((item) => item.hash === result.blockHash)
              : undefined);

          if (block) {
            this.selectBlock.emit(block);
            this.menuOpen.set(false);
            return;
          }

          this.errorMessage.set('Bloc introuvable dans la chaîne locale.');
        });
      return;
    }

    if (result.kind === 'ADDRESS') {
      this.errorMessage.set(
        result.balance != null
          ? `Solde ${result.address}: ${result.balance} R4V3`
          : 'Adresse trouvée.'
      );
    }
  }

  kindLabel(kind: ExplorerSearchResult['kind']): string {
    switch (kind) {
      case 'BLOCK':
        return 'Bloc';
      case 'TRANSACTION':
        return 'TX';
      case 'PENDING':
        return 'Pending';
      case 'ADDRESS':
        return 'Adresse';
      default:
        return 'Résultat';
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.menuOpen()) {
      return;
    }

    if (this.host.nativeElement.contains(event.target as Node)) {
      return;
    }

    this.menuOpen.set(false);
  }

  @HostListener('window:explorer-search-focus')
  onExternalFocusRequest(): void {
    const input = this.host.nativeElement.querySelector('input');
    input?.focus();
    this.inputFocused.set(true);
    this.menuOpen.set(true);
    this.host.nativeElement.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    });
  }

  @HostListener('window:explorer-search-query', ['$event'])
  onExternalQueryRequest(event: Event): void {
    const customEvent = event as CustomEvent<{ query?: string }>;
    const query = customEvent.detail?.query?.trim();
    if (!query) {
      return;
    }

    this.query.set(query);
    this.search$.next(query);
    this.onExternalFocusRequest();
  }
}
