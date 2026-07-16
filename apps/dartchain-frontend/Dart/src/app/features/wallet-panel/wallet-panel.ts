import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
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
import { CryptoRatesService } from '../../core/services/crypto-rate.service';
import { LocaleService } from '../../core/i18n/locale.service';
import {
  formatR4v3Amount,
  normalizeR4v3Amount,
  R4V3_DECIMALS,
} from '../../core/utils/r4v3-amount.util';

@Component({
  selector: 'app-wallet-panel',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './wallet-panel.html',
  styleUrls: ['./wallet-panel.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WalletPanelComponent implements OnInit {
  protected readonly auth = inject(AuthService);
  protected readonly locale = inject(LocaleService);
  private readonly api = inject(BlockchainApiService);
  private readonly walletSession = inject(WalletSessionService);
  private readonly chainConfig = inject(ChainConfigService);
  private readonly cryptoRates = inject(CryptoRatesService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly wallet = signal<WalletResponse | null>(
    this.walletSession.wallet()
  );
  protected readonly balance = signal<string>('0');
  protected readonly lookedUpBalance = signal<string | null>(null);
  protected readonly lookedUpAddress = signal('');
  protected readonly eurRate = signal(0);

  protected readonly creatingWallet = signal(false);
  protected readonly refreshingBalance = signal(false);
  protected readonly mining = signal(false);
  protected readonly sending = signal(false);

  protected readonly errorMessage = signal('');
  protected readonly successMessage = signal('');
  protected readonly toastMessage = signal('');
  protected readonly toastKind = signal<'success' | 'error' | 'info'>('info');
  protected readonly copiedAddress = signal(false);
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

  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private copiedTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly hasWallet = computed(() => this.wallet() !== null);
  protected readonly walletAddress = computed(() => this.wallet()?.address ?? '');
  protected readonly walletPublicKey = computed(() => this.wallet()?.publicKey ?? '');
  protected readonly walletPrivateKey = computed(() => this.wallet()?.privateKey ?? '');
  protected readonly totalBalance = computed(() => this.balance());
  protected readonly availableBalance = computed(() => this.totalBalance());
  protected readonly formattedTotalBalance = computed(() =>
    formatR4v3Amount(this.totalBalance())
  );
  protected readonly formattedAvailableBalance = computed(() =>
    formatR4v3Amount(this.availableBalance())
  );

  protected readonly networkLabel = computed(
    () => this.chainConfig.config()?.networkName ?? 'R4V3 MAINNET'
  );
  protected readonly nativeToken = computed(
    () => this.chainConfig.config()?.nativeToken ?? 'R4V3'
  );

  protected readonly totalBalanceEur = computed(() => {
    const bal = Number.parseFloat(this.totalBalance()) || 0;
    return bal * this.eurRate();
  });

  protected readonly formattedTotalFiat = computed(() =>
    this.formatFiatApprox(this.totalBalanceEur())
  );

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
    return this.formatFiatApprox(amount * this.eurRate());
  });

  protected readonly shortAddress = computed(() => {
    const address = this.walletAddress();
    if (!address) {
      return '—';
    }

    return address.length > 16
      ? `${address.slice(0, 8)}...${address.slice(-6)}`
      : address;
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

  ngOnInit(): void {
    void this.chainConfig.load();

    this.cryptoRates
      .getR4v3FeaturedPanel()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((panel) => {
        this.eurRate.set(this.parseRateValue(panel.value));
      });

    const sessionWallet = this.walletSession.wallet();
    if (sessionWallet) {
      this.wallet.set(sessionWallet);
      this.balanceForm.patchValue({ address: sessionWallet.address });
      this.fetchBalance(sessionWallet.address, true, false);
      this.syncLinkedWallet(sessionWallet);
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
        const address = this.walletAddress();
        if (address) {
          this.fetchBalance(address, true, false);
        }
      });
  }

  protected createWallet(): void {
    this.clearMessages();
    this.creatingWallet.set(true);

    void this.api
      .createWalletClientSide()
      .then((wallet) => {
        this.walletSession.setWallet(wallet);
        this.wallet.set(wallet);
        this.balanceForm.patchValue({ address: wallet.address });
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
    if (this.hasWallet()) {
      this.refreshMyBalance();
      return;
    }

    this.successMessage.set(this.locale.t('wallet.noWallet'));
  }

  protected refreshMyBalance(): void {
    const address = this.walletAddress();

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

    const address = this.balanceForm.getRawValue().address.trim();
    this.fetchBalance(address, false);
  }

  protected explorerAddressInvalid(): boolean {
    const control = this.balanceForm.controls.address;
    return control.invalid && (control.dirty || control.touched);
  }

  protected mineForCurrentWallet(): void {
    this.clearMessages();

    if (!this.auth.isAuthenticated()) {
      this.errorMessage.set('Connecte-toi pour miner.');
      this.pushToast('Connexion requise pour miner', 'error');
      this.auth.openDrawer('login');
      return;
    }

    const minerAddress = this.walletAddress();

    if (!minerAddress) {
      this.errorMessage.set('Crée un wallet.');
      return;
    }

    this.mining.set(true);

    this.api
      .minePendingTransactions({ minerAddress })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.successMessage.set('Bloc miné.');
          this.mining.set(false);
          this.fetchBalance(minerAddress, true);
        },
        error: (error: unknown) => {
          this.errorMessage.set(
            this.resolveErrorMessage(error, 'Minage impossible.')
          );
          this.mining.set(false);
        },
      });
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

  protected useWalletAddressInForm(): void {
    const address = this.walletAddress();

    if (!address) {
      this.errorMessage.set(this.locale.t('wallet.noWallet'));
      return;
    }

    this.balanceForm.patchValue({ address });
    this.successMessage.set('Adresse chargée.');
  }

  private fetchBalance(
    address: string,
    fromCurrentWallet: boolean,
    announce = true
  ): void {
    this.refreshingBalance.set(true);

    this.api
      .getBalance(address)
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
            this.lookedUpAddress.set(address);
          }
          if (announce) {
            this.successMessage.set(
              fromCurrentWallet
                ? 'Solde mis à jour.'
                : `Solde ${this.shorten(address)} chargé.`
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

  protected formatEur(value: number): string {
    const localeId = this.locale.locale() === 'fr' ? 'fr-FR' : 'en-EU';
    return new Intl.NumberFormat(localeId, {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  protected formatFiatApprox(eurValue: number): string {
    const localeId = this.locale.locale() === 'fr' ? 'fr-FR' : 'en-EU';
    const amount = new Intl.NumberFormat(localeId, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(eurValue);
    return this.locale.t('wallet.fiatApprox').replace('{amount}', amount);
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
    }
  }

  protected receiveAction(): void {
    this.showSendPanel.set(false);
    this.showReceivePanel.update((open) => !open);
    if (this.showReceivePanel()) {
      void this.generateReceiveQr();
    } else {
      this.qrDataUrl.set(null);
    }
  }

  protected mineButtonLabel(): string {
    if (this.mining()) {
      return this.locale.t('wallet.mining');
    }

    if (!this.auth.isAuthenticated()) {
      return this.locale.t('wallet.login');
    }

    return this.locale.t('wallet.mine');
  }

  protected copyWalletAddress(): void {
    this.copyToClipboard(this.walletAddress(), 'adresse');
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
        values.recipient.trim(),
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
      const url = await QRCode.toDataURL(address, {
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

  private parseRateValue(value: string): number {
    const normalized = value.replace(/\s/g, '').replace(',', '.');
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private clearMessages(): void {
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  private pushToast(message: string, kind: 'success' | 'error' | 'info'): void {
    this.toastMessage.set(message);
    this.toastKind.set(kind);
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
    this.toastTimer = setTimeout(() => this.toastMessage.set(''), 1800);
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
