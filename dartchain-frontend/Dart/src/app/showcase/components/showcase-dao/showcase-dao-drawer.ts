import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { DaoShowcaseCard, daoStatusLabel } from '@showcase/models/showcase-dao.model';
import { CommunityFaqQuestion } from '@showcase/models/r4v3-hub.model';
import { AuthService } from '@auth/services/auth.service';
import { R4v3CommunityFaqService } from '@showcase/services/r4v3-community-faq.service';
import { ShowcaseDaoStateService } from '@showcase/services/showcase-dao-state.service';
import { FocusTrapDirective } from '@core/directives/focus-trap.directive';

type DaoSubDrawer = 'proposal' | 'detail';

@Component({
  selector: 'app-showcase-dao-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule, FocusTrapDirective],
  templateUrl: './showcase-dao-drawer.html',
  styleUrls: ['./showcase-dao-drawer.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShowcaseDaoDrawerComponent {
  private readonly drawerPanel = viewChild<ElementRef<HTMLElement>>('drawerPanel');
  private readonly subDrawerPanel = viewChild<ElementRef<HTMLElement>>('subDrawerPanel');

  readonly card = input<DaoShowcaseCard | null>(null);
  readonly closeDrawer = output<void>();
  readonly refreshed = output<void>();

  protected readonly auth = inject(AuthService);
  protected readonly community = inject(R4v3CommunityFaqService);
  protected readonly daoState = inject(ShowcaseDaoStateService);

  readonly askTitle = signal('');
  readonly askBody = signal('');
  readonly formSuccess = signal(false);
  readonly subDrawer = signal<DaoSubDrawer | null>(null);

  readonly questions = computed(() => {
    const current = this.card();
    return current ? this.daoState.questionsForDao(current.symbol) : [];
  });

  readonly openProposals = computed(
    () => this.questions().filter((question) => question.status === 'open').length
  );

  readonly previewQuestions = computed(() => this.questions().slice(0, 2));

  readonly hiddenQuestionCount = computed(() => Math.max(0, this.questions().length - 2));

  readonly roleLabel = computed(() => (this.auth.isAuthenticated() ? 'Member' : 'Guest'));

  readonly submitMessage = this.community.submitMessage;

  constructor() {
    effect(() => {
      if (this.card()) {
        queueMicrotask(() => this.drawerPanel()?.nativeElement.focus());
      } else {
        this.resetForm();
        this.subDrawer.set(null);
      }
    });

    effect(() => {
      if (this.subDrawer()) {
        queueMicrotask(() => this.subDrawerPanel()?.nativeElement.focus());
      }
    });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.subDrawer()) {
      this.closeSub();
      return;
    }
    if (this.card()) {
      this.dismiss();
    }
  }

  dismiss(): void {
    this.subDrawer.set(null);
    this.closeDrawer.emit();
  }

  protected openSub(mode: DaoSubDrawer): void {
    this.subDrawer.set(mode);
  }

  protected closeSub(): void {
    this.subDrawer.set(null);
    queueMicrotask(() => this.drawerPanel()?.nativeElement.focus());
  }

  protected statusLabel(card: DaoShowcaseCard): string {
    return daoStatusLabel(card.status);
  }

  protected initials(card: DaoShowcaseCard): string {
    const symbol = card.symbol?.trim() || card.name?.trim() || '?';
    return symbol.slice(0, 2).toUpperCase();
  }

  protected xpPercent(card: DaoShowcaseCard): number {
    const raw = Math.round((card.membersActive / 40) * 100 + card.proposalsCount * 4);
    return Math.max(8, Math.min(100, raw));
  }

  protected intelText(card: DaoShowcaseCard): string {
    const desc = card.description?.trim();
    if (desc && desc !== card.summary && desc !== card.objective) {
      return desc;
    }
    return `Gouvernance communautaire ${card.symbol} — décisions on-chain.`;
  }

  protected voteQuestion(question: CommunityFaqQuestion, direction: 'UP' | 'DOWN'): void {
    this.community.voteQuestion(question.id, direction);
    this.refreshed.emit();
  }

  protected submitQuestion(): void {
    const current = this.card();
    if (!current) {
      return;
    }
    const ok = this.daoState.askDaoQuestion(current.symbol, this.askTitle(), this.askBody());
    if (ok) {
      this.formSuccess.set(true);
      this.askTitle.set('');
      this.askBody.set('');
      this.refreshed.emit();
      window.setTimeout(() => {
        this.formSuccess.set(false);
        this.closeSub();
      }, 900);
    }
  }

  protected canAsk(): boolean {
    return this.auth.isAuthenticated();
  }

  protected promptLogin(): void {
    this.auth.openDrawer('login');
  }

  private resetForm(): void {
    this.askTitle.set('');
    this.askBody.set('');
    this.formSuccess.set(false);
  }
}
