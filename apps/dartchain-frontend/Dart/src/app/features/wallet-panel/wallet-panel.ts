import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  OnInit,
  AfterViewInit,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import {
  BalanceResponse,
  BlockchainApiService,
  WalletResponse,
} from '../../core/services/blockchain-api.service';
import { WalletSessionService } from '../../core/services/wallet-session.service';
import { AuthService } from '../../core/services/auth.service';
import { ChainConfigService } from '../../core/services/chain-config.service';
import { LocaleService } from '../../core/i18n/locale.service';
import {
  formatR4v3Amount,
  normalizeR4v3Amount,
  R4V3_DECIMALS,
} from '../../core/utils/r4v3-amount.util';
import {
  displayR4v3Address,
  normalizeAddressForApi,
} from '../../core/utils/wallet-address.util';
import {
  DOCK_REFRESH_EVENT,
  refreshEventMatchesTab,
} from '../../core/constants/panel-refresh.constants';
import { WalletFaucetEmbedComponent } from './wallet-faucet-embed';
import { R4v3ThreeComponent } from '../r4v3-three/r4v3-three';

@Component({
  selector: 'app-wallet-panel',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, WalletFaucetEmbedComponent, R4v3ThreeComponent],
  templateUrl: './wallet-panel.html',
  styleUrls: ['./wallet-panel.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WalletPanelComponent implements OnInit, AfterViewInit {
  @ViewChild('bodyScrollRef') private bodyScrollRef?: ElementRef<HTMLElement>;
  @ViewChild('tetrisPlayfieldRef') private tetrisPlayfieldRef?: ElementRef<HTMLElement>;
  @ViewChild('tetrisRef') private tetrisRef?: ElementRef<HTMLElement>;
  @ViewChild('sendPanelRef') private sendPanelRef?: ElementRef<HTMLElement>;
  @ViewChild('receivePanelRef') private receivePanelRef?: ElementRef<HTMLElement>;

  protected readonly auth = inject(AuthService);
  protected readonly locale = inject(LocaleService);
  protected readonly displayR4v3Address = displayR4v3Address;
  private readonly api = inject(BlockchainApiService);
  private readonly walletSession = inject(WalletSessionService);
  private readonly chainConfig = inject(ChainConfigService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly wallet = signal<WalletResponse | null>(
    this.walletSession.wallet()
  );
  protected readonly balance = signal<string>('0');
  protected readonly lookedUpBalance = signal<string | null>(null);
  protected readonly lookedUpAddress = signal('');

  protected readonly creatingWallet = signal(false);
  protected readonly refreshingBalance = signal(false);
  protected readonly sending = signal(false);

  protected readonly errorMessage = signal('');
  protected readonly successMessage = signal('');
  protected readonly copiedAddress = signal(false);
  protected readonly copiedLookupAddress = signal(false);
  protected readonly copiedPublicKey = signal(false);
  protected readonly copiedPrivateKey = signal(false);
  protected readonly showSendPanel = signal(false);
  protected readonly showReceivePanel = signal(false);
  protected readonly qrDataUrl = signal<string | null>(null);

  protected readonly privateKeyVisible = signal(false);
  protected readonly publicKeyVisible = signal(false);

  protected readonly balanceForm = this.fb.nonNullable.group({
    address: ['', [Validators.required, Validators.minLength(8)]],
  });
  protected readonly sendForm = this.fb.nonNullable.group({
    recipient: ['', [Validators.required, Validators.minLength(8)]],
    amount: [0, [Validators.required, Validators.min(0.0001)]],
    memo: [''],
  });

  private copiedTimer: ReturnType<typeof setTimeout> | null = null;
  private copiedLookupTimer: ReturnType<typeof setTimeout> | null = null;
  private copiedPublicKeyTimer: ReturnType<typeof setTimeout> | null = null;
  private copiedPrivateKeyTimer: ReturnType<typeof setTimeout> | null = null;
  private messageTimer: ReturnType<typeof setTimeout> | null = null;
  private lastBalanceFetchAddress = '';

  protected readonly hasWallet = computed(() => this.wallet() !== null);
  protected readonly walletAddress = computed(() => this.wallet()?.address ?? '');
  protected readonly walletPublicKey = computed(() => this.wallet()?.publicKey ?? '');
  protected readonly walletPrivateKey = computed(() => this.wallet()?.privateKey ?? '');
  protected readonly displayWalletAddress = computed(
    () => this.walletAddress() || this.auth.user()?.walletAddress?.trim() || ''
  );
  protected readonly balanceWatchAddress = computed(() => {
    const linked = this.auth.user()?.walletAddress?.trim() ?? '';
    if (this.auth.isAuthenticated() && linked) {
      return linked;
    }

    return this.walletAddress();
  });
  protected readonly totalBalance = computed(() => this.balance());
  protected readonly availableBalance = computed(() => this.totalBalance());
  protected readonly formattedTotalBalance = computed(() =>
    formatR4v3Amount(this.totalBalance())
  );
  protected readonly stackedBalanceLines = computed(() => {
    const normalized = normalizeR4v3Amount(this.totalBalance());
    const negative = normalized.startsWith('-');
    const unsigned = negative ? normalized.slice(1) : normalized;
    const [wholeRaw, fractionRaw = ''] = unsigned.split('.');
    const whole = wholeRaw || '0';
    const fraction = `${fractionRaw}${'0'.repeat(R4V3_DECIMALS)}`.slice(0, R4V3_DECIMALS);
    const prefix = negative ? '-' : '';

    return {
      whole: `${prefix}${whole}`,
      line1: fraction.slice(0, 3),
      line2: fraction.slice(3, 13),
      line3: fraction.slice(13, 23),
      line4: fraction.slice(23, 26),
    };
  });

  private static readonly TETRIS_CELL_PX = 4;
  private static readonly TETRIS_GAP_PX = 1;
  private static readonly TETRIS_PAD_PX = 2;
  private static readonly TETRIS_MIN_COLS = 5;
  private static readonly TETRIS_MIN_ROWS = 6;

  protected readonly tetrisColCount = signal(WalletPanelComponent.TETRIS_MIN_COLS);
  protected readonly tetrisRowCount = signal(WalletPanelComponent.TETRIS_MIN_ROWS);
  protected readonly tetrisBoard = signal<boolean[][]>([]);
  protected readonly tetrisCols = computed(() =>
    Array.from({ length: this.tetrisColCount() }, (_, index) => index)
  );
  protected readonly tetrisRows = computed(() =>
    Array.from({ length: this.tetrisRowCount() }, (_, index) => index)
  );
  protected readonly tetrisCol = signal(2);
  protected readonly tetrisRow = signal(0);
  private tetrisFallTimer: ReturnType<typeof setInterval> | null = null;
  private tetrisResizeObserver: ResizeObserver | null = null;
  private tetrisGridReady = false;
  protected readonly formattedChfValue = computed(() => {
    const bal = Number.parseFloat(this.totalBalance()) || 0;
    const localeId = this.locale.locale() === 'fr' ? 'fr-FR' : 'en-GB';
    return new Intl.NumberFormat(localeId, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(bal);
  });
  protected readonly formattedAvailableBalance = computed(() =>
    formatR4v3Amount(this.availableBalance())
  );

  protected readonly nativeToken = computed(
    () => this.chainConfig.config()?.nativeToken ?? 'R4V3'
  );

  protected readonly formattedTotalFiat = computed(() => {
    const bal = Number.parseFloat(this.totalBalance()) || 0;
    return this.formatFiatApprox(bal);
  });

  protected readonly formattedLookedUpBalance = computed(() => {
    const bal = this.lookedUpBalance();
    return bal ? formatR4v3Amount(bal) : null;
  });

  protected readonly formattedLookedUpFiat = computed(() => {
    const bal = this.lookedUpBalance();
    if (!bal) {
      return null;
    }
    const amount = Number.parseFloat(bal) || 0;
    return this.formatFiatApprox(amount);
  });

  protected readonly shortDisplayAddress = computed(() => {
    const address = this.displayWalletAddress();
    const displayed = displayR4v3Address(address);
    if (!address) {
      return '—';
    }

    return displayed.length > 20
      ? `${displayed.slice(0, 12)}...${displayed.slice(-6)}`
      : displayed;
  });

  protected readonly accountDisplayName = computed(() => {
    const username = this.auth.user()?.username?.trim();
    if (username) {
      return username;
    }

    return '—';
  });

  protected readonly balanceAddressPrefix = computed(() => {
    const address = this.displayWalletAddress();
    const displayed = displayR4v3Address(address);
    if (!address) {
      return '—';
    }

    return displayed.length > 14 ? `${displayed.slice(0, 12)}…` : displayed;
  });

  protected readonly maskedPublicKey = computed(() => {
    const value = this.walletPublicKey();
    if (!value) {
      return '—';
    }

    return this.publicKeyVisible()
      ? value
      : `${value.slice(0, 10)}••••${value.slice(-8)}`;
  });

  protected readonly maskedPrivateKey = computed(() => {
    const value = this.walletPrivateKey();
    if (!value) {
      return '—';
    }

    return this.privateKeyVisible()
      ? value
      : `${value.slice(0, 8)}••••••${value.slice(-6)}`;
  });

  protected readonly centerTone = computed<'idle' | 'error' | 'success' | 'info'>(() => {
    if (this.errorMessage()) {
      return 'error';
    }
    if (this.successMessage()) {
      return 'success';
    }
    if (this.creatingWallet() || this.refreshingBalance()) {
      return 'info';
    }
    return 'idle';
  });

  protected readonly centerMessage = computed(() => {
    if (this.creatingWallet()) {
      return 'Création du wallet…';
    }
    if (this.errorMessage()) {
      return this.errorMessage();
    }
    if (this.successMessage()) {
      return this.successMessage();
    }
    if (!this.hasWallet()) {
      return this.locale.t('wallet.noWallet');
    }
    if (this.refreshingBalance()) {
      return 'Synchronisation…';
    }
    return 'Wallet actif';
  });

  protected readonly shouldShowStatusLine = computed(() => {
    if (this.hasWallet() && this.centerTone() === 'idle' && !this.refreshingBalance()) {
      return false;
    }

    return Boolean(this.centerMessage());
  });

  constructor() {
    effect(() => {
      const sessionWallet = this.walletSession.wallet();
      if (!sessionWallet) {
        return;
      }

      if (sessionWallet.address !== this.wallet()?.address) {
        this.wallet.set(sessionWallet);
        this.balanceForm.patchValue(
          { address: displayR4v3Address(sessionWallet.address) },
          { emitEvent: false }
        );
        this.fetchBalance(sessionWallet.address, true, false);
        this.syncLinkedWallet(sessionWallet);
      }
    });

    effect(() => {
      const linked = this.auth.user()?.walletAddress?.trim();
      if (!linked || this.hasWallet()) {
        return;
      }

      if (linked !== this.lastBalanceFetchAddress) {
        this.fetchBalance(linked, true, false);
      }
    });
  }

  ngOnInit(): void {
    void this.chainConfig.load();

    const sessionWallet = this.walletSession.wallet();
    if (sessionWallet) {
      this.wallet.set(sessionWallet);
      this.balanceForm.patchValue(
        { address: displayR4v3Address(sessionWallet.address) },
        { emitEvent: false }
      );
      this.fetchBalance(sessionWallet.address, true, false);
      this.syncLinkedWallet(sessionWallet);
    } else {
      const linked = this.auth.user()?.walletAddress?.trim();
      if (linked) {
        this.fetchBalance(linked, true, false);
      }
    }

    this.balanceForm.controls.address.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.clearMessages();
      });

    this.sendForm.controls.recipient.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.clearMessages());

    this.sendForm.controls.amount.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.clearMessages());

    this.walletSession.balanceRefresh$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const address = this.balanceWatchAddress();
        if (address) {
          this.fetchBalance(address, true, false);
        }
      });

    this.tetrisFallTimer = setInterval(() => this.tickTetrisFall(), 650);
    this.destroyRef.onDestroy(() => {
      if (this.tetrisFallTimer) {
        clearInterval(this.tetrisFallTimer);
        this.tetrisFallTimer = null;
      }
      if (this.tetrisResizeObserver) {
        this.tetrisResizeObserver.disconnect();
        this.tetrisResizeObserver = null;
      }
    });
  }

  ngAfterViewInit(): void {
    const playfield = this.tetrisPlayfieldRef?.nativeElement;
    if (!playfield) {
      return;
    }

    const applySize = (): void => {
      const rect = playfield.getBoundingClientRect();
      this.syncTetrisGridSize(rect.width, rect.height);
    };

    applySize();
    this.tetrisResizeObserver = new ResizeObserver(() => applySize());

    this.tetrisResizeObserver.observe(playfield);
    const tetrisHost = this.tetrisRef?.nativeElement;
    if (tetrisHost) {
      this.tetrisResizeObserver.observe(tetrisHost);
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(applySize);
    });
  }

  protected isTetrisCellLocked(col: number, row: number): boolean {
    return this.tetrisBoard()[row]?.[col] ?? false;
  }

  protected isTetrisCellActive(col: number, row: number): boolean {
    return this.tetrisCol() === col && this.tetrisRow() === row;
  }

  private syncTetrisGridSize(width: number, height: number): void {
    const cell = WalletPanelComponent.TETRIS_CELL_PX;
    const gap = WalletPanelComponent.TETRIS_GAP_PX;
    const pad = WalletPanelComponent.TETRIS_PAD_PX;
    const innerWidth = Math.max(0, width - pad * 2);
    const innerHeight = Math.max(0, height - pad * 2);
    const nextCols = Math.max(
      WalletPanelComponent.TETRIS_MIN_COLS,
      Math.floor((innerWidth + gap) / (cell + gap))
    );
    const nextRows = Math.max(
      WalletPanelComponent.TETRIS_MIN_ROWS,
      Math.floor((innerHeight + gap) / (cell + gap))
    );
    const sizeChanged =
      nextCols !== this.tetrisColCount() || nextRows !== this.tetrisRowCount();

    if (sizeChanged) {
      this.tetrisColCount.set(nextCols);
      this.tetrisRowCount.set(nextRows);
      this.resizeTetrisBoard(nextCols, nextRows);
    }

    if (!this.tetrisGridReady && nextCols > 0 && nextRows > 0) {
      this.tetrisGridReady = true;
      this.resetTetrisGame(nextCols, nextRows);
    }
  }

  private createEmptyTetrisBoard(cols: number, rows: number): boolean[][] {
    return Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => false)
    );
  }

  private resetTetrisGame(cols: number, rows: number): void {
    this.tetrisBoard.set(this.createEmptyTetrisBoard(cols, rows));
    this.spawnTetrisPiece();
  }

  private resizeTetrisBoard(nextCols: number, nextRows: number): void {
    const previous = this.tetrisBoard();
    const nextBoard = Array.from({ length: nextRows }, (_, row) =>
      Array.from({ length: nextCols }, (_, col) => previous[row]?.[col] ?? false)
    );
    this.tetrisBoard.set(nextBoard);

    const col = Math.min(this.tetrisCol(), nextCols - 1);
    const row = Math.min(this.tetrisRow(), nextRows - 1);
    this.tetrisCol.set(col);
    this.tetrisRow.set(row);

    if (!this.canMoveTo(this.tetrisCol(), this.tetrisRow())) {
      this.spawnTetrisPiece();
    }
  }

  private canMoveTo(col: number, row: number): boolean {
    if (col < 0 || col >= this.tetrisColCount()) {
      return false;
    }
    if (row < 0 || row >= this.tetrisRowCount()) {
      return false;
    }

    return !this.tetrisBoard()[row]?.[col];
  }

  private spawnTetrisPiece(): void {
    const cols = this.tetrisColCount();
    const col = Math.floor(cols / 2);

    if (!this.canMoveTo(col, 0)) {
      this.resetTetrisGame(cols, this.tetrisRowCount());
      return;
    }

    this.tetrisCol.set(col);
    this.tetrisRow.set(0);
  }

  private lockTetrisPiece(): void {
    const col = this.tetrisCol();
    const row = this.tetrisRow();
    const board = this.tetrisBoard().map((line) => [...line]);
    board[row][col] = true;
    this.tetrisBoard.set(board);
    this.clearTetrisLines();
    this.spawnTetrisPiece();
  }

  private clearTetrisLines(): void {
    const cols = this.tetrisColCount();
    const rows = this.tetrisRowCount();
    const board = this.tetrisBoard();
    const remaining = board.filter((line) => !line.every(Boolean));
    const clearedCount = rows - remaining.length;

    if (clearedCount <= 0) {
      return;
    }

    const emptyRows = Array.from({ length: clearedCount }, () =>
      Array.from({ length: cols }, () => false)
    );
    this.tetrisBoard.set([...emptyRows, ...remaining]);
  }

  protected moveTetrisHorizontal(delta: number, event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();
    const nextCol = this.tetrisCol() + delta;
    if (this.canMoveTo(nextCol, this.tetrisRow())) {
      this.tetrisCol.set(nextCol);
    }
  }

  protected moveTetrisDown(event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();
    this.advanceTetrisRow();
  }

  private tickTetrisFall(): void {
    this.advanceTetrisRow();
  }

  private advanceTetrisRow(): void {
    const nextRow = this.tetrisRow() + 1;
    if (this.canMoveTo(this.tetrisCol(), nextRow)) {
      this.tetrisRow.set(nextRow);
      return;
    }

    this.lockTetrisPiece();
  }

  protected createWallet(): void {
    this.clearMessages();
    this.creatingWallet.set(true);

    void this.api
      .createWalletClientSide()
      .then((wallet) => {
        this.walletSession.setWallet(wallet);
        this.wallet.set(wallet);
        this.balanceForm.patchValue(
          { address: displayR4v3Address(wallet.address) },
          { emitEvent: false }
        );
        this.creatingWallet.set(false);

        if (this.auth.isAuthenticated()) {
          void this.auth.linkWallet(wallet.address, wallet.publicKey);
        }

        this.successMessage.set('Wallet créé localement (clé privée non envoyée au serveur).');
        this.fetchBalance(wallet.address, true, false);
      })
      .catch((error: unknown) => {
        this.errorMessage.set(
          this.resolveErrorMessage(error, 'Création wallet impossible.')
        );
        this.creatingWallet.set(false);
      });
  }

  protected refreshAll(): void {
    this.clearMessages();
    const address = this.balanceWatchAddress();
    if (!address) {
      return;
    }

    this.fetchBalance(address, true);
  }

  @HostListener(`window:${DOCK_REFRESH_EVENT}`, ['$event'])
  onDockRefresh(event: Event): void {
    if (refreshEventMatchesTab(event, 'wallet')) {
      this.refreshAll();
    }
  }

  protected refreshMyBalance(): void {
    const address = this.balanceWatchAddress();

    if (!address) {
      this.errorMessage.set(this.locale.t('wallet.noWallet'));
      return;
    }

    this.fetchBalance(address, true);
  }

  protected fetchBalanceFromForm(): void {
    this.clearMessages();

    if (this.balanceForm.invalid) {
      this.balanceForm.markAllAsTouched();
      this.errorMessage.set(this.locale.t('wallet.validation.recipient'));
      return;
    }

    const address = normalizeAddressForApi(this.balanceForm.getRawValue().address.trim());
    this.fetchBalance(address, false);
  }

  protected explorerAddressInvalid(): boolean {
    const control = this.balanceForm.controls.address;
    return control.invalid && (control.dirty || control.touched);
  }

  protected copyToClipboard(value: string, label: string): void {
    if (!value || value === '—') {
      this.errorMessage.set(`Aucune donnée ${label}.`);
      this.pushToast(`Aucune donnée ${label}.`, 'error');
      return;
    }

    this.copyText(value)
      .then(() => {
        this.successMessage.set(`${label} copié.`);
        this.pushToast(`${label} copié`, 'success');
      })
      .catch(() => {
        this.errorMessage.set(`Copie ${label} impossible.`);
        this.pushToast(`Copie ${label} impossible`, 'error');
      });
  }

  protected togglePrivateKeyVisibility(): void {
    this.privateKeyVisible.update((value) => !value);
  }

  protected togglePublicKeyVisibility(): void {
    this.publicKeyVisible.update((value) => !value);
  }

  protected copyPublicKey(event: Event): void {
    event.stopPropagation();
    const label = this.locale.t('wallet.keys.public');
    const value = this.walletPublicKey();
    if (!value) {
      this.errorMessage.set(`Aucune donnée ${label}.`);
      this.pushToast(`Aucune donnée ${label}.`, 'error');
      return;
    }

    void this.copyText(value)
      .then(() => {
        this.successMessage.set(`${label} copié.`);
        this.pushToast(`${label} copié`, 'success');
        this.copiedPublicKey.set(true);
        if (this.copiedPublicKeyTimer) {
          clearTimeout(this.copiedPublicKeyTimer);
        }
        this.copiedPublicKeyTimer = setTimeout(() => this.copiedPublicKey.set(false), 1500);
      })
      .catch(() => {
        this.errorMessage.set(`Copie ${label} impossible.`);
        this.pushToast(`Copie ${label} impossible`, 'error');
      });
  }

  protected copyPrivateKey(event: Event): void {
    event.stopPropagation();
    const label = this.locale.t('wallet.keys.private');
    const value = this.walletPrivateKey();
    if (!value) {
      this.errorMessage.set(`Aucune donnée ${label}.`);
      this.pushToast(`Aucune donnée ${label}.`, 'error');
      return;
    }

    void this.copyText(value)
      .then(() => {
        this.successMessage.set(`${label} copié.`);
        this.pushToast(`${label} copié`, 'success');
        this.copiedPrivateKey.set(true);
        if (this.copiedPrivateKeyTimer) {
          clearTimeout(this.copiedPrivateKeyTimer);
        }
        this.copiedPrivateKeyTimer = setTimeout(() => this.copiedPrivateKey.set(false), 1500);
      })
      .catch(() => {
        this.errorMessage.set(`Copie ${label} impossible.`);
        this.pushToast(`Copie ${label} impossible`, 'error');
      });
  }

  protected onTogglePublicKeyVisibility(event: Event): void {
    event.stopPropagation();
    this.togglePublicKeyVisibility();
  }

  protected onTogglePrivateKeyVisibility(event: Event): void {
    event.stopPropagation();
    this.togglePrivateKeyVisibility();
  }

  @HostListener('keydown', ['$event'])
  protected onScrollKeydown(event: KeyboardEvent): void {
    if (this.isEditableTarget(event.target)) {
      return;
    }

    if (
      this.hasWallet() &&
      !this.showSendPanel() &&
      !this.showReceivePanel() &&
      this.tetrisGridReady
    ) {
      switch (event.key) {
        case 'ArrowLeft':
          this.moveTetrisHorizontal(-1);
          event.preventDefault();
          return;
        case 'ArrowRight':
          this.moveTetrisHorizontal(1);
          event.preventDefault();
          return;
        case 'ArrowDown':
          this.moveTetrisDown();
          event.preventDefault();
          return;
        default:
          break;
      }
    }

    const container = this.findScrollContainer(event.target as Node | null);
    if (!container || container.scrollHeight <= container.clientHeight) {
      return;
    }

    const lineStep = 36;
    let delta = 0;

    switch (event.key) {
      case 'ArrowDown':
        delta = lineStep;
        break;
      case 'ArrowUp':
        delta = -lineStep;
        break;
      case 'PageDown':
        delta = container.clientHeight;
        break;
      case 'PageUp':
        delta = -container.clientHeight;
        break;
      case 'Home':
        container.scrollTop = 0;
        event.preventDefault();
        return;
      case 'End':
        container.scrollTop = container.scrollHeight;
        event.preventDefault();
        return;
      default:
        return;
    }

    container.scrollTop = Math.max(
      0,
      Math.min(container.scrollHeight - container.clientHeight, container.scrollTop + delta)
    );
    event.preventDefault();
  }

  private isEditableTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
      return false;
    }

    const tag = target.tagName;
    return (
      tag === 'INPUT' ||
      tag === 'TEXTAREA' ||
      tag === 'SELECT' ||
      target.isContentEditable
    );
  }

  private findScrollContainer(target: Node | null): HTMLElement | null {
    if (target instanceof HTMLElement) {
      const panel = target.closest('.wallet-display__panel');
      if (panel instanceof HTMLElement) {
        return panel;
      }
    }

    const body = this.bodyScrollRef?.nativeElement;
    if (!body?.classList.contains('is-wallet-active')) {
      return null;
    }

    if (this.showSendPanel() || this.showReceivePanel()) {
      return null;
    }

    if (target && body.contains(target)) {
      return body;
    }

    if (document.activeElement === body) {
      return body;
    }

    return null;
  }

  private focusScrollContainer(ref?: ElementRef<HTMLElement>): void {
    ref?.nativeElement.focus({ preventScroll: true });
  }

  protected copyLookupAddress(): void {
    const raw = this.balanceForm.getRawValue().address.trim();
    if (!raw) {
      this.errorMessage.set(this.locale.t('wallet.validation.recipient'));
      return;
    }

    const value = displayR4v3Address(normalizeAddressForApi(raw));
    this.copyText(value)
      .then(() => {
        this.copiedLookupAddress.set(true);
        this.successMessage.set('Adresse R4V3 copiée.');
        if (this.copiedLookupTimer) {
          clearTimeout(this.copiedLookupTimer);
        }
        this.copiedLookupTimer = setTimeout(
          () => this.copiedLookupAddress.set(false),
          1500
        );
      })
      .catch(() => {
        this.errorMessage.set("Copie de l'adresse impossible.");
      });
  }

  private fetchBalance(
    address: string,
    fromCurrentWallet: boolean,
    announce = true
  ): void {
    const normalizedAddress = normalizeAddressForApi(address);
    if (!normalizedAddress) {
      return;
    }

    this.lastBalanceFetchAddress = normalizedAddress;
    this.refreshingBalance.set(true);

    this.api
      .getBalance(normalizedAddress)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response: BalanceResponse) => {
          const normalized = normalizeR4v3Amount(response.balance);
          if (fromCurrentWallet) {
            this.balance.set(normalized);
            this.lookedUpBalance.set(null);
            this.lookedUpAddress.set('');
          } else {
            this.lookedUpBalance.set(normalized);
            this.lookedUpAddress.set(normalizedAddress);
          }
          if (announce) {
            this.successMessage.set(
              fromCurrentWallet
                ? 'Solde mis à jour.'
                : `Solde ${this.shorten(displayR4v3Address(normalizedAddress))} chargé.`
            );
          }
          this.refreshingBalance.set(false);
        },
        error: (error: unknown) => {
          this.errorMessage.set(
            this.resolveErrorMessage(error, 'Lecture du solde impossible.')
          );
          this.refreshingBalance.set(false);
        },
      });
  }

  protected shorten(value: string): string {
    return value.length > 16 ? `${value.slice(0, 8)}...${value.slice(-6)}` : value;
  }

  protected formatAmount(value: string | number, digits = R4V3_DECIMALS): string {
    return formatR4v3Amount(value, digits);
  }

  protected formatFiatApprox(r4v3Amount: number): string {
    const localeId = this.locale.locale() === 'fr' ? 'fr-FR' : 'en-GB';
    const amount = new Intl.NumberFormat(localeId, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(r4v3Amount);
    return this.locale.t('wallet.fiatApprox').replace('{chf}', amount);
  }

  protected sendAction(): void {
    if (!this.auth.promptLogin()) {
      this.errorMessage.set('Connectez-vous pour envoyer des fonds.');
      this.pushToast('Connexion requise pour envoyer', 'error');
      return;
    }

    this.showReceivePanel.set(false);
    this.showSendPanel.update((open) => !open);
    if (this.showSendPanel()) {
      this.sendForm.patchValue({
        recipient: '',
        amount: 0,
        memo: '',
      });
      queueMicrotask(() => this.focusScrollContainer(this.sendPanelRef));
    }
  }

  protected receiveAction(): void {
    this.showSendPanel.set(false);
    this.showReceivePanel.update((open) => !open);
    if (this.showReceivePanel()) {
      void this.generateReceiveQr();
      queueMicrotask(() => this.focusScrollContainer(this.receivePanelRef));
    } else {
      this.qrDataUrl.set(null);
    }
  }

  protected copyWalletAddress(): void {
    const address = this.displayWalletAddress();
    if (!address) {
      this.errorMessage.set(this.locale.t('wallet.noWallet'));
      return;
    }

    this.copyToClipboard(displayR4v3Address(address), 'adresse');
    this.copiedAddress.set(true);
    if (this.copiedTimer) {
      clearTimeout(this.copiedTimer);
    }
    this.copiedTimer = setTimeout(() => this.copiedAddress.set(false), 1500);
  }

  protected submitSend(): void {
    this.clearMessages();

    if (!this.auth.promptLogin()) {
      this.errorMessage.set('Connectez-vous pour envoyer des fonds.');
      this.pushToast('Connexion requise pour envoyer', 'error');
      return;
    }

    if (!this.hasWallet()) {
      this.errorMessage.set(this.locale.t('wallet.noWallet'));
      this.pushToast('Créez un wallet avant envoi', 'error');
      return;
    }

    if (this.sendForm.invalid) {
      this.sendForm.markAllAsTouched();
      this.errorMessage.set('Formulaire envoi invalide.');
      this.pushToast('Vérifiez le destinataire et le montant', 'error');
      return;
    }

    const sender = this.wallet();
    if (!sender) {
      this.errorMessage.set('Wallet introuvable.');
      return;
    }

    if (!sender.privateKey) {
      this.errorMessage.set('Clé privée locale requise pour signer la transaction.');
      this.pushToast('Wallet sans clé privée locale', 'error');
      return;
    }

    const values = this.sendForm.getRawValue();
    const memo = values.memo.trim();
    this.sending.set(true);

    void this.api
      .sendTransaction(
        sender.address,
        sender.publicKey,
        sender.privateKey,
        normalizeAddressForApi(values.recipient.trim()),
        Number(values.amount),
        memo || undefined
      )
      .then(() => {
        this.sending.set(false);
        this.showSendPanel.set(false);
        this.successMessage.set('Transaction signée et envoyée.');
        this.pushToast('Transaction envoyée', 'success');
        this.refreshMyBalance();
      })
      .catch((error: unknown) => {
        this.sending.set(false);
        const message = this.resolveErrorMessage(error, "Échec de l'envoi de la transaction.");
        this.errorMessage.set(message);
        this.pushToast(message, 'error');
      });
  }

  protected closeActionPanels(): void {
    this.showSendPanel.set(false);
    this.showReceivePanel.set(false);
    this.qrDataUrl.set(null);
  }

  private async generateReceiveQr(): Promise<void> {
    const address = this.walletAddress();
    if (!address) {
      this.qrDataUrl.set(null);
      return;
    }

    try {
      const { default: QRCode } = await import('qrcode');
      const url = await QRCode.toDataURL(displayR4v3Address(address), {
        margin: 1,
        width: 168,
        color: {
          dark: '#00e5ff',
          light: '#021425',
        },
      });
      this.qrDataUrl.set(url);
    } catch {
      this.qrDataUrl.set(null);
    }
  }

  protected recipientInvalid(): boolean {
    const control = this.sendForm.controls.recipient;
    return control.invalid && (control.dirty || control.touched);
  }

  protected amountInvalid(): boolean {
    const control = this.sendForm.controls.amount;
    return control.invalid && (control.dirty || control.touched);
  }

  private clearMessages(): void {
    this.errorMessage.set('');
    this.successMessage.set('');
    if (this.messageTimer) {
      clearTimeout(this.messageTimer);
      this.messageTimer = null;
    }
  }

  private pushToast(message: string, kind: 'success' | 'error' | 'info'): void {
    if (kind === 'error') {
      this.errorMessage.set(message);
    } else {
      this.successMessage.set(message);
    }

    if (this.messageTimer) {
      clearTimeout(this.messageTimer);
    }
    this.messageTimer = setTimeout(() => {
      this.errorMessage.set('');
      this.successMessage.set('');
      this.messageTimer = null;
    }, 2400);
  }

  private copyText(value: string): Promise<void> {
    if (navigator.clipboard?.writeText) {
      return navigator.clipboard.writeText(value);
    }

    return new Promise<void>((resolve, reject) => {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = value;
        textArea.setAttribute('readonly', '');
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        if (successful) {
          resolve();
        } else {
          reject(new Error('copy-failed'));
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  private resolveErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    return fallback;
  }

  private syncLinkedWallet(wallet: WalletResponse): void {
    if (!this.auth.isAuthenticated()) {
      return;
    }

    const profile = this.auth.user();
    if (profile?.walletAddress === wallet.address) {
      return;
    }

    void this.auth.linkWallet(wallet.address, wallet.publicKey);
  }
}
