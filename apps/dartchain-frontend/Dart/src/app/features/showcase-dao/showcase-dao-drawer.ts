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

import { DaoShowcaseCard, daoStatusLabel } from '../../core/models/showcase-dao.model';
import { CommunityFaqQuestion } from '../../core/models/r4v3-hub.model';
import { AuthService } from '../../core/services/auth.service';
import { R4v3CommunityFaqService } from '../../core/services/r4v3-community-faq.service';
import { ShowcaseDaoStateService } from '../../core/services/showcase-dao-state.service';
import { FocusTrapDirective } from '../../core/directives/focus-trap.directive';

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

  readonly card = input<DaoShowcaseCard | null>(null);

  readonly closeDrawer = output<void>();
  readonly refreshed = output<void>();

  protected readonly auth = inject(AuthService);
  protected readonly community = inject(R4v3CommunityFaqService);
  protected readonly daoState = inject(ShowcaseDaoStateService);

  readonly askTitle = signal('');
  readonly askBody = signal('');
  readonly formSuccess = signal(false);
  readonly expandedQuestionId = signal<string | null>(null);

  readonly questions = computed(() => {
    const current = this.card();
    if (!current) {
      return [];
    }
    return this.daoState.questionsForDao(current.symbol);
  });

  readonly openProposals = computed(
    () => this.questions().filter((question) => question.status === 'open').length
  );

  readonly submitMessage = this.community.submitMessage;

  constructor() {
    effect(() => {
      if (this.card()) {
        queueMicrotask(() => this.drawerPanel()?.nativeElement.focus());
      } else {
        this.resetForm();
      }
    });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.card()) {
      this.dismiss();
    }
  }

  dismiss(): void {
    this.closeDrawer.emit();
  }

  protected statusLabel(card: DaoShowcaseCard): string {
    return daoStatusLabel(card.status);
  }

  protected initials(card: DaoShowcaseCard): string {
    const symbol = card.symbol?.trim() || card.name?.trim() || '?';
    return symbol.slice(0, 2).toUpperCase();
  }

  protected toggleQuestion(question: CommunityFaqQuestion): void {
    this.expandedQuestionId.update((current) =>
      current === question.id ? null : question.id
    );
  }

  protected isQuestionExpanded(question: CommunityFaqQuestion): boolean {
    return this.expandedQuestionId() === question.id;
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

    const ok = this.daoState.askDaoQuestion(
      current.symbol,
      this.askTitle(),
      this.askBody()
    );

    if (ok) {
      this.formSuccess.set(true);
      this.askTitle.set('');
      this.askBody.set('');
      window.setTimeout(() => this.formSuccess.set(false), 2400);
    }
  }

  protected canAsk(): boolean {
    return this.auth.isAuthenticated();
  }

  private resetForm(): void {
    this.askTitle.set('');
    this.askBody.set('');
    this.formSuccess.set(false);
    this.expandedQuestionId.set(null);
  }
}
