import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, Injector, computed, inject, signal } from '@angular/core';
import { Subject } from 'rxjs';

import { CreateLaunchProjectRequest, LaunchProject, LaunchStatus } from '@showcase/models/showcase.model';
import { AuthService } from '@auth/services/auth.service';
import { LaunchDrawerService } from './launch-drawer.service';
import { ShowcaseApiService } from './showcase-api.service';

export type LaunchWorkflowPhase =
  | 'error'
  | 'loading'
  | 'ready'
  | 'waiting'
  | 'running'
  | 'done';

@Injectable({ providedIn: 'root' })
export class ShowcaseLaunchStateService {
  private readonly api = inject(ShowcaseApiService);
  private readonly injector = inject(Injector);
  private readonly launchDrawer = inject(LaunchDrawerService);
  private readonly refreshRequested = new Subject<void>();

  readonly refresh$ = this.refreshRequested.asObservable();

  readonly loading = signal(false);
  readonly error = signal(false);
  readonly projects = signal<LaunchProject[]>([]);
  readonly lastUpdatedAt = signal<Date | null>(null);
  readonly successMessage = signal<string | null>(null);

  readonly counts = computed(() => {
    const items = this.projects();
    return {
      total: items.length,
      live: items.filter((project) => project.status === 'LIVE').length,
      soon: items.filter((project) => project.status === 'SOON').length,
      ended: items.filter((project) => project.status === 'ENDED').length,
    };
  });

  readonly phase = computed((): LaunchWorkflowPhase => {
    if (this.error()) {
      return 'error';
    }
    if (this.loading()) {
      return 'loading';
    }

    const { total, live, soon, ended } = this.counts();
    if (total === 0) {
      return 'ready';
    }
    if (live > 0) {
      return 'running';
    }
    if (soon > 0) {
      return 'waiting';
    }
    if (ended === total) {
      return 'done';
    }

    return 'ready';
  });

  readonly statusLabel = computed(() => {
    switch (this.phase()) {
      case 'error':
        return 'Erreur';
      case 'loading':
        return 'Chargement';
      case 'ready':
        return 'Prêt';
      case 'waiting':
        return 'En attente';
      case 'running':
        return 'En cours';
      case 'done':
        return 'Terminé';
      default:
        return 'Launch';
    }
  });

  readonly progressLabel = computed(() => {
    const { total, live, soon, ended } = this.counts();
    if (this.loading()) {
      return 'Synchronisation des projets…';
    }
    if (this.error()) {
      return 'Impossible de charger les lancements';
    }
    if (total === 0) {
      return 'Aucun projet — prêt à lancer';
    }

    return `${live} live · ${soon} soon · ${ended} ended`;
  });

  readonly headline = computed(() => {
    const items = this.projects();
    if (items.length === 0) {
      return this.successMessage() ?? '';
    }

    const live = items.find((project) => project.status === 'LIVE');
    if (live) {
      return `${live.symbol} live — ${live.raised}${live.target && live.target !== '—' ? ` / ${live.target}` : ''}`;
    }

    const soon = items.find((project) => project.status === 'SOON');
    if (soon) {
      return `Prochain : ${soon.name} (${soon.symbol})`;
    }

    const last = items[items.length - 1];
    return `${last.name} (${last.symbol}) — ${this.statusLabelFor(last.status)}`;
  });

  readonly progressPercent = computed(() => {
    const { total, live, ended } = this.counts();
    if (total === 0) {
      return 0;
    }
    return Math.round(((live + ended) / total) * 100);
  });

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

  readonly liveProjects = computed(() =>
    this.projects().filter((project) => project.status === 'LIVE')
  );

  readonly latestProject = computed(() => this.projects()[0] ?? null);

  readonly collapsedStatusKey = computed((): LaunchStatus | 'empty' => {
    const latest = this.latestProject();
    return latest?.status ?? 'empty';
  });

  readonly collapsedStatusLabel = computed(() => {
    switch (this.collapsedStatusKey()) {
      case 'LIVE':
        return 'Live';
      case 'SOON':
        return 'Soon';
      case 'ENDED':
        return 'Ended';
      default:
        return this.loading() ? 'Sync…' : 'Launch';
    }
  });

  readonly collapsedStatusCount = computed(() => {
    const counts = this.counts();
    switch (this.collapsedStatusKey()) {
      case 'LIVE':
        return counts.live;
      case 'SOON':
        return counts.soon;
      case 'ENDED':
        return counts.ended;
      default:
        return counts.total;
    }
  });

  readonly collapsedStatusHeadline = computed(() => {
    const count = this.collapsedStatusCount();
    const label = this.collapsedStatusLabel().toUpperCase();
    if (this.loading()) {
      return 'SYNC…';
    }
    if (this.error()) {
      return 'ERREUR';
    }
    return count > 0 ? `${count} ${label}` : label;
  });

  readonly collapsedTickerProjects = computed(() => {
    if (this.collapsedStatusKey() === 'LIVE') {
      return this.liveProjects();
    }

    const latest = this.latestProject();
    return latest ? [latest] : [];
  });

  readonly collapsedPhaseClass = computed(() => {
    switch (this.collapsedStatusKey()) {
      case 'LIVE':
        return 'running';
      case 'SOON':
        return 'waiting';
      case 'ENDED':
        return 'done';
      default:
        return this.phase();
    }
  });

  marketCapLabel(project: LaunchProject): string {
    if (project.target && project.target !== '—') {
      return `${project.raised} / ${project.target}`;
    }
    return project.raised;
  }

  loadProjects(): void {
    this.loading.set(true);
    this.error.set(false);

    this.api.getLaunchProjects().subscribe({
      next: (items) => {
        this.projects.set(items);
        this.lastUpdatedAt.set(new Date());
        this.loading.set(false);
      },
      error: () => {
        this.projects.set([]);
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  requestRefresh(): void {
    this.successMessage.set(null);
    this.loadProjects();
    this.refreshRequested.next();
  }

  openLaunchDrawer(): void {
    if (!this.authService().promptLogin()) {
      this.successMessage.set(null);
      return;
    }

    this.launchDrawer.open();
  }

  createProject(request: CreateLaunchProjectRequest): void {
    if (!this.authService().promptLogin()) {
      this.launchDrawer.setError('Connectez-vous pour créer un projet LaunchLab.');
      return;
    }

    this.launchDrawer.setSubmitting(true);
    this.launchDrawer.setError(null);

    this.api.createLaunchProject(request).subscribe({
      next: (project) => {
        this.successMessage.set(`Projet ${project.symbol} créé (Soon).`);
        this.launchDrawer.setSubmitting(false);
        this.launchDrawer.close();
        this.loadProjects();
      },
      error: (error: unknown) => {
        this.launchDrawer.setError(this.resolveCreateError(error));
        this.launchDrawer.setSubmitting(false);
      },
    });
  }

  private statusLabelFor(status: LaunchStatus): string {
    switch (status) {
      case 'LIVE':
        return 'Live';
      case 'ENDED':
        return 'Ended';
      default:
        return 'Soon';
    }
  }

  /** Injection paresseuse pour éviter le cycle AuthService → QuestsProgressService → ShowcaseLaunchStateService. */
  private authService(): AuthService {
    return this.injector.get(AuthService);
  }

  private resolveCreateError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 409) {
        return error.error?.message ?? 'Ce symbole est déjà utilisé.';
      }
      return error.error?.message ?? 'Création impossible.';
    }

    return 'Création impossible.';
  }

  constructor() {
    this.launchDrawer.onCreate$.subscribe((request) => this.createProject(request));
  }
}
