import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  HostBinding,
  HostListener,
  OnInit,
  computed,
  inject,
} from '@angular/core';

import { BrandCryptoSymbol, BRAND_DEFAULT_CRYPTO } from '../core/constants/rate-panel-symbols';
import {
  EXCHANGE_LAUNCHPAD_SWAP_TOKENS,
  isLaunchpadSwapToken,
} from '../core/constants/exchange-launchpad.constants';
import { BrandCryptoSelectionService } from '../core/services/brand-crypto-selection.service';
import { ShowcaseLaunchStateService } from '../core/services/showcase-launch-state.service';
import { ShowcaseNavigationService } from '../core/services/showcase-navigation.service';
import { LaunchProject, LaunchStatus } from '../core/models/showcase.model';

const LAUNCH_TOKEN_DISPLAY: Record<string, string> = {
  PXD: 'Pixel DAO',
  LAB3: 'Lab #03',
  NVFI: 'NovaFi',
  ORB: 'Orbit Swap',
};

function launchTokenRank(symbol: string): number {
  const normalized = symbol.trim().toUpperCase();
  const index = (EXCHANGE_LAUNCHPAD_SWAP_TOKENS as readonly string[]).indexOf(normalized);
  return index >= 0 ? index : 99;
}

function launchStatusRank(status: LaunchStatus): number {
  if (status === 'LIVE') return 0;
  if (status === 'SOON') return 1;
  return 2;
}

function sortLaunchProjects(projects: LaunchProject[]): LaunchProject[] {
  return [...projects].sort(
    (a, b) =>
      launchTokenRank(a.symbol) - launchTokenRank(b.symbol) ||
      launchStatusRank(a.status) - launchStatusRank(b.status) ||
      a.symbol.localeCompare(b.symbol)
  );
}

function buildFallbackLaunchProjects(): LaunchProject[] {
  return EXCHANGE_LAUNCHPAD_SWAP_TOKENS.map((symbol) => ({
    id: `fallback-${symbol}`,
    symbol,
    name: LAUNCH_TOKEN_DISPLAY[symbol] ?? symbol,
    status: 'LIVE' as const,
    raised: '—',
  }));
}

@Component({
  selector: 'app-brand-crypto-select',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './brand-crypto-select.html',
  styleUrl: './brand-crypto-select.css',
})
export class BrandCryptoSelectComponent implements OnInit {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly nav = inject(ShowcaseNavigationService);
  readonly selection = inject(BrandCryptoSelectionService);
  readonly launchState = inject(ShowcaseLaunchStateService);

  menuOpen = false;

  readonly nativeToken = BRAND_DEFAULT_CRYPTO;

  @HostBinding('class.is-token-menu-open')
  get tokenMenuOpen(): boolean {
    return this.menuOpen;
  }

  @HostBinding('attr.data-token-menu-open')
  get tokenMenuOpenAttr(): 'true' | 'false' {
    return this.menuOpen ? 'true' : 'false';
  }

  readonly platformLaunchProjects = computed(() => {
    const filtered = this.launchState
      .projects()
      .filter((project) => isLaunchpadSwapToken(project.symbol));

    if (filtered.length > 0) {
      return sortLaunchProjects(filtered);
    }

    if (this.launchState.loading()) {
      return [];
    }

    return buildFallbackLaunchProjects();
  });

  readonly hasLaunchProjects = computed(() => this.platformLaunchProjects().length > 0);

  ngOnInit(): void {
    this.launchState.loadProjects();
  }

  toggleMenu(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.menuOpen = !this.menuOpen;
  }

  selectSymbol(symbol: BrandCryptoSymbol): void {
    if (symbol === BRAND_DEFAULT_CRYPTO) {
      this.selection.selectFromRatePanel(BRAND_DEFAULT_CRYPTO, null);
      this.nav.requestTab('r4v3');
    } else {
      this.selection.select(symbol);
    }
    this.menuOpen = false;
  }

  selectLaunchProject(project: LaunchProject, event: MouseEvent): void {
    event.stopPropagation();
    this.selection.selectLaunchToken(project.symbol);
    this.menuOpen = false;
  }

  launchStatusLabel(status: LaunchProject['status']): string {
    switch (status) {
      case 'LIVE':
        return 'Live';
      case 'ENDED':
        return 'Ended';
      default:
        return 'Soon';
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.menuOpen) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Node)) {
      this.menuOpen = false;
      return;
    }

    if (this.host.nativeElement.contains(target)) {
      return;
    }

    this.menuOpen = false;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.menuOpen = false;
  }
}
