import { Injectable, computed, inject, signal } from '@angular/core';
import { Subject, debounceTime, distinctUntilChanged, finalize, take } from 'rxjs';

import { CommunityFaqApiQuestion } from '../models/showcase.model';
import { CommunityFaqQuestion } from '../models/r4v3-hub.model';
import { AuthService } from './auth.service';
import { ShowcaseApiService } from './showcase-api.service';

@Injectable({ providedIn: 'root' })
export class R4v3CommunityFaqService {
  private readonly auth = inject(AuthService);
  private readonly api = inject(ShowcaseApiService);
  private readonly searchInput$ = new Subject<string>();

  readonly loading = signal(false);
  readonly refreshing = signal(false);
  readonly error = signal(false);
  readonly questions = signal<CommunityFaqQuestion[]>([]);
  readonly latestTicker = signal<CommunityFaqQuestion | null>(null);
  readonly searchQuery = signal('');
  readonly debouncedSearchQuery = signal('');
  readonly draftQuestion = signal('');
  readonly submitMessage = signal('');

  readonly filteredQuestions = computed(() => {
    const query = this.debouncedSearchQuery().trim().toLowerCase();
    const items = this.questions();

    if (!query) {
      return items;
    }

    return items.filter(
      (q) =>
        q.title.toLowerCase().includes(query) ||
        q.body.toLowerCase().includes(query) ||
        q.answers.some((a) => a.body.toLowerCase().includes(query))
    );
  });

  readonly openCount = computed(
    () => this.questions().filter((q) => q.status === 'open').length
  );

  readonly pendingReviewCount = computed(
    () => this.questions().filter((q) => q.pendingStaffReview).length
  );

  readonly unreadCount = computed(
    () => this.questions().filter((q) => q.isUnread).length
  );

  readonly canAsk = computed(() => this.auth.isAuthenticated());

  constructor() {
    this.searchInput$
      .pipe(debounceTime(180), distinctUntilChanged())
      .subscribe((query) => this.debouncedSearchQuery.set(query));
  }

  onSearchInput(value: string): void {
    this.searchQuery.set(value);
    this.searchInput$.next(value);
  }

  load(showLoading = false): void {
    if (showLoading) {
      this.loading.set(true);
    } else {
      this.refreshing.set(true);
    }
    this.error.set(false);

    this.api
      .getCommunityFaqQuestions()
      .pipe(
        take(1),
        finalize(() => {
          this.loading.set(false);
          this.refreshing.set(false);
        })
      )
      .subscribe({
        next: (response) => {
          this.questions.set(response.questions.map((item) => this.mapQuestion(item)));
          this.refreshLatestTicker();
        },
        error: () => this.error.set(true),
      });
  }

  refreshLatestTicker(): void {
    this.api
      .getLatestCommunityFaqQuestion()
      .pipe(take(1))
      .subscribe((item) => {
        this.latestTicker.set(item ? this.mapQuestion(item) : this.questions()[0] ?? null);
      });
  }

  markRead(id: string): void {
    this.questions.update((items) =>
      items.map((q) => (q.id === id ? { ...q, isUnread: false } : q))
    );
  }

  askQuestion(title: string, body: string): boolean {
    const user = this.auth.user();
    if (!user) {
      this.submitMessage.set('Connectez-vous pour poser une question.');
      return false;
    }

    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();
    if (trimmedTitle.length < 8 || trimmedBody.length < 12) {
      this.submitMessage.set('Question trop courte (min. 8 / 12 caractères).');
      return false;
    }

    this.api
      .createCommunityFaqQuestion({ title: trimmedTitle, body: trimmedBody })
      .pipe(take(1))
      .subscribe({
        next: (created) => {
          const question = this.mapQuestion(created);
          this.questions.update((items) => [question, ...items]);
          this.latestTicker.set(question);
          this.draftQuestion.set('');
          this.submitMessage.set('Question publiée — en attente de réponse.');
          window.setTimeout(() => this.submitMessage.set(''), 3_000);
        },
        error: () => {
          this.submitMessage.set('Publication impossible pour le moment.');
        },
      });

    return true;
  }

  voteQuestion(id: string, direction: 'UP' | 'DOWN'): void {
    if (!this.auth.isAuthenticated()) {
      this.submitMessage.set('Connectez-vous pour voter.');
      window.setTimeout(() => this.submitMessage.set(''), 2_500);
      return;
    }

    this.api
      .voteCommunityFaqQuestion(id, { direction })
      .pipe(take(1))
      .subscribe({
        next: (updated) => {
          const mapped = this.mapQuestion(updated);
          this.questions.update((items) =>
            items.map((item) => (item.id === id ? mapped : item))
          );
          if (this.latestTicker()?.id === id) {
            this.latestTicker.set(mapped);
          }
        },
        error: () => {
          this.submitMessage.set('Vote impossible pour le moment.');
          window.setTimeout(() => this.submitMessage.set(''), 2_500);
        },
      });
  }

  submitAnswer(questionId: string, body: string): boolean {
    const user = this.auth.user();
    if (!user) {
      return false;
    }

    const trimmed = body.trim();
    if (trimmed.length < 8) {
      return false;
    }

    const answer = {
      id: `ca-${Date.now()}`,
      authorId: user.id ?? user.username ?? 'anonymous',
      authorName: user.username ?? user.email ?? 'Utilisateur',
      body: trimmed,
      isStaff: false,
      isValidated: false,
      isHighlighted: false,
      createdAt: new Date().toISOString(),
      relativeTime: "à l'instant",
      votes: 0,
    };

    this.questions.update((items) =>
      items.map((q) => {
        if (q.id !== questionId) {
          return q;
        }

        const answers = [...q.answers, answer];
        return {
          ...q,
          answers,
          answerCount: answers.length,
          status: q.status === 'open' ? ('answered' as const) : q.status,
          pendingStaffReview: true,
        };
      })
    );

    return true;
  }

  private mapQuestion(item: CommunityFaqApiQuestion): CommunityFaqQuestion {
    return {
      id: item.id,
      authorId: item.authorId,
      authorName: item.authorName,
      title: item.title,
      body: item.body,
      createdAt: item.createdAt,
      relativeTime: formatRelativeTime(item.createdAt),
      status: mapStatus(item),
      answers: [],
      answerCount: item.answerCount,
      pendingStaffReview: item.pendingStaffReview,
      score: item.score,
      upvotes: item.upvotes,
      downvotes: item.downvotes,
      userVote: item.userVote ?? null,
    };
  }
}

function mapStatus(item: CommunityFaqApiQuestion): CommunityFaqQuestion['status'] {
  if (item.status === 'PINNED') {
    return 'pinned';
  }
  if (item.answerCount > 0) {
    return 'answered';
  }
  return 'open';
}

function formatRelativeTime(iso: string): string {
  const created = Date.parse(iso);
  if (Number.isNaN(created)) {
    return '—';
  }

  const deltaMs = Date.now() - created;
  const minutes = Math.floor(deltaMs / 60_000);
  if (minutes < 1) {
    return "à l'instant";
  }
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} h`;
  }

  const days = Math.floor(hours / 24);
  return `${days} j`;
}
