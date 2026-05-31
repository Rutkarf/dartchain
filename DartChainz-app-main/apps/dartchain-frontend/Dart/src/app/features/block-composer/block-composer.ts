import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  HostListener,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { firstValueFrom, startWith } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Block } from '../../core/models/block.model';
import { BlockchainApiService } from '../../core/services/blockchain-api.service';
import { WalletSessionService } from '../../core/services/wallet-session.service';

@Component({
  selector: 'app-block-composer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './block-composer.html',
  styleUrl: './block-composer.css',
})
export class BlockComposerComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly api = inject(BlockchainApiService);
  private readonly walletSession = inject(WalletSessionService);
  private readonly maxLength = 500;

  readonly loading = signal(false);
  readonly successMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly latestBlock = signal<Block | null>(null);
  readonly chainLoading = signal(false);

  readonly form = this.fb.nonNullable.group({
    fromAddress: ['', [Validators.required, Validators.minLength(4)]],
    toAddress: ['', [Validators.required, Validators.minLength(4)]],
    amount: ['', [Validators.required, Validators.min(0.00000001)]],
    data: ['', [Validators.maxLength(this.maxLength)]],
  });

  readonly textValue = signal('');
  readonly rawTextLength = computed(() => this.textValue().length);
  readonly textLength = computed(() => this.textValue().trim().length);
  readonly remainingChars = computed(() => this.maxLength - this.rawTextLength());
  readonly isBusy = computed(() => this.loading());

  readonly canSubmit = computed(() => {
    return (
      !this.isBusy() &&
      this.form.valid &&
      this.textLength() <= this.maxLength
    );
  });

  readonly walletAddress = computed(() => this.walletSession.address());

  constructor() {
    this.dataControl.valueChanges
      .pipe(
        startWith(this.dataControl.value),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((value) => {
        this.textValue.set((value ?? '').toString());
      });

    effect(() => {
      if (this.isBusy()) {
        this.form.disable({ emitEvent: false });
      } else {
        this.form.enable({ emitEvent: false });
      }
    });
  }

  ngOnInit(): void {
    void this.loadChainTip();
  }

  @HostListener('window:naivechain-refresh')
  onGlobalRefresh(): void {
    void this.loadChainTip();
  }

  get fromControl() {
    return this.form.controls.fromAddress;
  }

  get toControl() {
    return this.form.controls.toAddress;
  }

  get amountControl() {
    return this.form.controls.amount;
  }

  get dataControl() {
    return this.form.controls.data;
  }

  get showRequiredError(): boolean {
    return (
      this.form.touched &&
      (this.fromControl.invalid || this.toControl.invalid || this.amountControl.invalid)
    );
  }

  get showMaxLengthError(): boolean {
    return this.rawTextLength() > this.maxLength;
  }

  get helperText(): string {
    if (this.showMaxLengthError) {
      return 'Le message optionnel doit rester sous 500 caractères.';
    }

    if (this.remainingChars() <= 50) {
      return `Il reste ${this.remainingChars()} caractères pour le message optionnel.`;
    }

    return 'La transaction sera signée côté backend puis ajoutée à la file pending.';
  }

  async submit(): Promise<void> {
    if (this.isBusy()) {
      return;
    }

    this.form.markAllAsTouched();
    this.successMessage.set(null);
    this.errorMessage.set(null);

    const fromAddress = this.fromControl.value.trim();
    const toAddress = this.toControl.value.trim();
    const amountValue = Number(this.amountControl.value);
    const data = this.dataControl.value.trim();

    if (
      !fromAddress ||
      !toAddress ||
      !Number.isFinite(amountValue) ||
      amountValue <= 0 ||
      this.rawTextLength() > this.maxLength
    ) {
      return;
    }

    this.loading.set(true);

    try {
      const response = await firstValueFrom(
        this.api.addPendingTransaction({
          fromAddress,
          toAddress,
          amount: amountValue,
          data,
        })
      );

      this.form.reset({
        fromAddress: fromAddress,
        toAddress: '',
        amount: '',
        data: '',
      });

      this.textValue.set('');
      this.form.markAsPristine();
      this.form.markAsUntouched();

      const transactionId =
        response?.transaction?.id ??
        response?.transaction?.hash ??
        'pending';

      this.successMessage.set(
        `Transaction pending créée (${transactionId.slice(0, 8)}…).`
      );

      window.dispatchEvent(new CustomEvent('naivechain-refresh'));
    } catch (error) {
      console.error(error);
      this.errorMessage.set('Impossible d’ajouter la transaction à la file pending.');
    } finally {
      this.loading.set(false);
    }
  }

  handleRefresh(): void {
    this.successMessage.set(null);
    this.errorMessage.set(null);
    this.form.markAsUntouched();
    void this.loadChainTip();
    window.dispatchEvent(new CustomEvent('naivechain-refresh'));
  }

  async loadChainTip(): Promise<void> {
    if (this.chainLoading()) {
      return;
    }

    this.chainLoading.set(true);

    try {
      const response = await firstValueFrom(this.api.getBlocks());
      const blocks = Array.isArray(response) ? response : [];
      const sorted = [...blocks].sort((a, b) => b.index - a.index);
      this.latestBlock.set(sorted[0] ?? null);
    } catch (error) {
      console.error(error);
      this.latestBlock.set(null);
    } finally {
      this.chainLoading.set(false);
    }
  }

  shortHash(hash: string | null | undefined, size = 6): string {
    if (!hash) {
      return 'N/A';
    }

    if (hash.length <= size * 2) {
      return hash;
    }

    return `${hash.slice(0, size)}…${hash.slice(-size)}`;
  }

  blockTxCount(block: Block): number {
    return block.transactions?.length ?? 0;
  }

  formatBlockTime(timestamp?: number | null): string {
    if (!timestamp) {
      return 'N/A';
    }

    const ts = timestamp > 1_000_000_000_000 ? timestamp : timestamp * 1000;
    return new Date(ts).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  fillFromWallet(): void {
    const address = this.walletSession.address();
    if (!address) {
      this.errorMessage.set('Créez un wallet d’abord.');
      return;
    }

    this.fromControl.setValue(address);
    this.errorMessage.set(null);
  }

  clearForm(): void {
    this.form.reset({
      fromAddress: this.walletSession.address() || '',
      toAddress: '',
      amount: '',
      data: '',
    });
    this.textValue.set('');
    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.successMessage.set(null);
    this.errorMessage.set(null);
  }

  openLatestBlock(): void {
    const block = this.latestBlock();
    if (!block) {
      return;
    }

    window.dispatchEvent(
      new CustomEvent('open-block-drawer', { detail: { block } })
    );
  }

  openPendingDock(): void {
    window.dispatchEvent(
      new CustomEvent('dock-open-panel', { detail: { panel: 'pending' } })
    );
  }
}