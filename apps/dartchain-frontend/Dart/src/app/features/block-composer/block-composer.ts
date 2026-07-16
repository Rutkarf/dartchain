import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  HostBinding,
  Input,
  OnInit,
  computed,
  effect,
  inject,
  output,
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
import { AuthService } from '../../core/services/auth.service';
import { WalletSessionService } from '../../core/services/wallet-session.service';
import { TransactionsDockService } from '../../core/services/transactions-dock.service';
import { TransactionsDataService } from '../../core/services/transactions-data.service';
import { LocaleService } from '../../core/i18n/locale.service';

@Component({
  selector: 'app-block-composer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './block-composer.html',
  styleUrl: './block-composer.css',
})
export class BlockComposerComponent implements OnInit {
  @Input() embedded = false;
  @Input() compact = false;

  @HostBinding('class.block-view--compact')
  get compactHostClass(): boolean {
    return this.compact;
  }

  readonly transactionCreated = output<string>();

  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly api = inject(BlockchainApiService);
  private readonly auth = inject(AuthService);
  private readonly walletSession = inject(WalletSessionService);
  private readonly transactionsDock = inject(TransactionsDockService);
  protected readonly data = inject(TransactionsDataService);
  protected readonly locale = inject(LocaleService);
  private readonly maxLength = 500;

  readonly loading = signal(false);
  readonly successMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  readonly latestBlock = computed(() => this.data.latestBlock());
  readonly chainLoading = computed(() => this.data.tipLoading());

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
  readonly isBusy = computed(() => this.loading() || this.data.pendingLoading());

  readonly canSubmit = computed(() => {
    return (
      !this.loading() &&
      this.form.valid &&
      this.textLength() <= this.maxLength
    );
  });

  readonly submitButtonLabel = computed(() => {
    if (this.loading()) {
      return 'Envoi…';
    }

    if (!this.auth.isAuthenticated()) {
      return 'Connexion';
    }

    return this.compact ? 'Créer tx' : 'Créer transaction';
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
      if (this.loading()) {
        this.form.disable({ emitEvent: false });
      } else {
        this.form.enable({ emitEvent: false });
      }
    });
  }

  ngOnInit(): void {
    this.fillFromWallet(true);
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

    return 'La transaction sera signée côté backend puis ajoutée au mempool.';
  }

  async submit(): Promise<void> {
    if (this.loading()) {
      return;
    }

    this.form.markAllAsTouched();
    this.successMessage.set(null);
    this.errorMessage.set(null);

    if (!this.auth.promptLogin()) {
      this.errorMessage.set('Connectez-vous pour créer une transaction.');
      return;
    }

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
      this.errorMessage.set('Complétez From, To et Amount (> 0).');
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

      this.successMessage.set(`Tx créée (${transactionId.slice(0, 8)}…).`);
      this.transactionCreated.emit(transactionId);
      this.transactionsDock.showMempool(transactionId);
      this.data.scheduleRefresh(true);
    } catch (error) {
      console.error(error);
      const status = (error as { status?: number })?.status;
      if (status === 429) {
        this.errorMessage.set('Trop de requêtes — réessayez dans 1 minute.');
      } else {
        this.errorMessage.set('Impossible d’ajouter la transaction au mempool.');
      }
    } finally {
      this.loading.set(false);
    }
  }

  handleRefresh(): void {
    this.successMessage.set(null);
    this.errorMessage.set(null);
    this.form.markAsUntouched();
    this.data.scheduleRefresh(true);
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

  fillFromWallet(silent = false): void {
    const address = this.walletSession.address();
    if (!address) {
      if (!silent) {
        this.errorMessage.set('Créez un wallet depuis l’onglet Wallet.');
      }
      return;
    }

    this.fromControl.setValue(address);
    this.fromControl.markAsDirty();
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

  focusComposerField(): void {
    document.getElementById('from-address')?.focus();
  }

  openPendingDock(): void {
    this.transactionsDock.showMempool();
  }
}
