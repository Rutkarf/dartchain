import { Injectable, computed, inject, signal } from '@angular/core';

import {
  DaoShowcaseCard,
  DaoGovernanceStatus,
  mapLaunchStatusToDao,
} from '../models/showcase-dao.model';
import { LaunchProject } from '../models/showcase.model';
import { CommunityFaqQuestion } from '../models/r4v3-hub.model';
import { R4v3CommunityFaqService } from './r4v3-community-faq.service';
import { ShowcaseLaunchStateService } from './showcase-launch-state.service';

@Injectable({ providedIn: 'root' })
export class ShowcaseDaoStateService {
  private readonly launchState = inject(ShowcaseLaunchStateService);
  private readonly community = inject(R4v3CommunityFaqService);

  readonly loading = signal(false);
  readonly error = signal(false);
  readonly lastUpdatedAt = signal<Date | null>(null);
  readonly searchQuery = signal('');

  readonly cards = computed(() => this.buildCards());

  readonly activeCards = computed(() =>
    this.cards().filter((card) => card.status === 'active')
  );

  readonly activeCount = computed(() => this.activeCards().length);

  readonly activeCountLabel = computed(() => {
    const count = this.activeCount();
    if (count === 0) {
      return '0 DAO ACTIVE';
    }
    return count === 1 ? '1 DAO ACTIVE' : `${count} DAO ACTIVES`;
  });

  readonly carouselCards = computed(() => {
    const active = this.activeCards();
    if (active.length > 0) {
      return active;
    }
    return this.cards();
  });

  readonly collapsedHeadline = computed(() => this.activeCountLabel());

  readonly updatedAgeLabel = computed(() => {
    const updated = this.lastUpdatedAt();
    if (!updated) {
      return '';
    }

    const seconds = Math.floor((Date.now() - updated.getTime()) / 1000);
    if (seconds < 5) {
      return "à l'instant";
    }
    if (seconds < 60) {
      return `il y a ${seconds} s`;
    }

    return `il y a ${Math.floor(seconds / 60)} min`;
  });

  readonly filteredCards = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const list = this.cards();
    if (!query) {
      return list;
    }
    return list.filter((card) => {
      const haystack = `${card.name} ${card.symbol} ${card.summary} ${card.objective}`.toLowerCase();
      return haystack.includes(query);
    });
  });

  load(showLoading = true): void {
    if (showLoading) {
      this.loading.set(true);
    }
    this.error.set(false);

    if (this.launchState.projects().length === 0) {
      this.launchState.loadProjects();
    }
    this.community.load(showLoading);

    window.setTimeout(() => {
      this.lastUpdatedAt.set(new Date());
      this.loading.set(false);
      this.error.set(this.launchState.error() || this.community.error());
    }, 180);
  }

  refresh(): void {
    this.loading.set(true);
    this.error.set(false);
    this.launchState.requestRefresh();
    this.community.load(false);
    window.setTimeout(() => {
      this.lastUpdatedAt.set(new Date());
      this.loading.set(false);
      this.error.set(this.launchState.error() || this.community.error());
    }, 220);
  }

  setSearchQuery(value: string): void {
    this.searchQuery.set(value);
  }

  questionsForDao(symbol: string): CommunityFaqQuestion[] {
    const normalized = symbol.trim().toUpperCase();
    const tagged = this.community
      .questions()
      .filter(
        (question) =>
          question.title.toUpperCase().includes(`[${normalized}]`) ||
          question.body.toUpperCase().includes(normalized)
      );

    if (tagged.length > 0) {
      return tagged;
    }

    const all = this.community.questions();
    if (all.length === 0) {
      return [];
    }

    const index = this.cards().findIndex((card) => card.symbol === normalized);
    if (index < 0) {
      return all.slice(0, 3);
    }

    return all.filter((_, itemIndex) => itemIndex % Math.max(this.cards().length, 1) === index);
  }

  askDaoQuestion(symbol: string, title: string, body: string): boolean {
    const normalized = symbol.trim().toUpperCase();
    const prefixedTitle = title.trim().toUpperCase().startsWith(`[${normalized}]`)
      ? title.trim()
      : `[${normalized}] ${title.trim()}`;
    return this.community.askQuestion(prefixedTitle, body);
  }

  private buildCards(): DaoShowcaseCard[] {
    const projects = this.launchState.projects();
    const questions = this.community.questions();

    return projects.map((project, index) => this.toCard(project, index, questions));
  }

  private toCard(
    project: LaunchProject,
    index: number,
    questions: CommunityFaqQuestion[]
  ): DaoShowcaseCard {
    const status = mapLaunchStatusToDao(project.status);
    const symbol = project.symbol.trim().toUpperCase();
    const daoQuestions = questions.filter(
      (question) =>
        question.title.toUpperCase().includes(`[${symbol}]`) ||
        question.body.toUpperCase().includes(symbol) ||
        questions.indexOf(question) % Math.max(this.launchState.projects().length, 1) === index
    );
    const proposalsCount = daoQuestions.length;
    const votesCount = daoQuestions.reduce(
      (total, question) => total + question.upvotes + question.downvotes,
      0
    );
    const raised = this.parseRaised(project.raised);

    return {
      id: `dao-${project.id}`,
      symbol,
      name: project.name,
      logoUrl: project.logoUrl,
      description: project.description,
      chain: project.chain,
      launchStatus: project.status,
      status,
      summary: this.buildSummary(project, status),
      objective: project.description?.trim() || this.defaultObjective(project),
      proposalsCount,
      votesCount,
      membersActive: Math.max(
        status === 'active' ? 8 : 3,
        Math.round(raised / 800) + index * 2 + (status === 'active' ? 6 : 2)
      ),
    };
  }

  private buildSummary(project: LaunchProject, status: DaoGovernanceStatus): string {
    if (project.description?.trim()) {
      const trimmed = project.description.trim();
      return trimmed.length > 72 ? `${trimmed.slice(0, 69)}…` : trimmed;
    }

    switch (status) {
      case 'active':
        return `Gouvernance communautaire active pour ${project.symbol}.`;
      case 'closed':
        return `DAO clôturée — historique des décisions ${project.symbol}.`;
      default:
        return `DAO en préparation — rejoignez la gouvernance ${project.symbol}.`;
    }
  }

  private defaultObjective(project: LaunchProject): string {
    return `Coordonner les décisions communautaires, la trésorerie et la roadmap de ${project.name}.`;
  }

  private parseRaised(value: string): number {
    if (!value || value === '—') {
      return 0;
    }
    const normalized = value.toLowerCase().replace(/\s/g, '');
    if (normalized.endsWith('k')) {
      return Number.parseFloat(normalized.replace('k', '')) * 1000;
    }
    const parsed = Number.parseFloat(normalized.replace(/[^\d.]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }
}
