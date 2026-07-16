import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { BottomDockTab } from '../../core/services/dock-navigation.service';
import { ProductConfigService } from '../../core/config/product-config.service';
import { AuthService } from '../../core/services/auth.service';
import { DockWalletSummaryComponent } from './dock-wallet-summary';
import { DockFaucetSummaryComponent } from './dock-faucet-summary';
import { DockTransactionsSummaryComponent } from './dock-transactions-summary';
import { DockChainSummaryComponent } from './dock-chain-summary';
import { DockMarketSummaryComponent } from './dock-market-summary';
import { DockQuestsSummaryComponent } from './dock-quests-summary';
import { DockPeersSummaryComponent } from './dock-peers-summary';

@Component({
  selector: 'app-dock-bottom-summary',
  standalone: true,
  imports: [
    DockWalletSummaryComponent,
    DockFaucetSummaryComponent,
    DockTransactionsSummaryComponent,
    DockChainSummaryComponent,
    DockMarketSummaryComponent,
    DockQuestsSummaryComponent,
    DockPeersSummaryComponent,
  ],
  templateUrl: './dock-bottom-summary.html',
  styleUrls: ['./dock-bottom-summary.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DockBottomSummaryComponent {
  @Input({ required: true }) activeTab: BottomDockTab = 'wallet';

  constructor(
    readonly product: ProductConfigService,
    readonly auth: AuthService
  ) {}
}
