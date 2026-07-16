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

import { BrandCryptoSymbol } from '../core/constants/rate-panel-symbols';
import { BrandCryptoSelectionService } from '../core/services/brand-crypto-selection.service';
import { ShowcaseLaunchStateService } from '../core/services/showcase-launch-state.service';
import { LaunchProject } from '../core/models/showcase.model';

@Component({
  selector: 'app-brand-crypto-select',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './brand-crypto-select.html',
  styleUrl: './brand-crypto-select.css',
})
export class BrandCryptoSelectComponent implements OnInit {
  private readonly host = inject(ElementRef<HTMLElement>);
  readonly selection = inject(BrandCryptoSelectionService);
  readonly launchState = inject(ShowcaseLaunchStateService);

  menuOpen = false;

  @HostBinding('class.is-token-menu-open')
  get tokenMenuOpen(): boolean {
    return this.menuOpen;
  }

  @HostBinding('attr.data-token-menu-open')
  get tokenMenuOpenAttr(): 'true' | 'false' {
    return this.menuOpen ? 'true' : 'false';
  }

  readonly launchProjects = computed(() =>
    [...this.launchState.projects()].sort((a, b) => {
      const rank = (status: LaunchProject['status']) => {
        if (status === 'LIVE') return 0;
        if (status === 'SOON') return 1;
        return 2;
      };
      return rank(a.status) - rank(b.status) || a.symbol.localeCompare(b.symbol);
    })
  );

  readonly hasLaunchProjects = computed(() => this.launchProjects().length > 0);

  ngOnInit(): void {
    this.launchState.loadProjects();
  }

  toggleMenu(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.menuOpen = !this.menuOpen;
  }

  selectSymbol(symbol: BrandCryptoSymbol): void {
    this.selection.select(symbol);
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
