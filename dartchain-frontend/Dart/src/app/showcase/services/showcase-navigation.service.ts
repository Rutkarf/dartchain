import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

import { ShowcaseTab } from '@showcase/models/showcase-tab.model';
import { NewsActionType } from '@showcase/models/showcase.model';

export interface ShowcaseNewsAction {
  type: NewsActionType;
  target: string | null;
}

@Injectable({ providedIn: 'root' })
export class ShowcaseNavigationService {
  private readonly newsActionSubject = new Subject<ShowcaseNewsAction>();
  private readonly tabRequestSubject = new Subject<ShowcaseTab>();

  readonly newsAction$ = this.newsActionSubject.asObservable();
  readonly tabRequest$ = this.tabRequestSubject.asObservable();

  requestTab(tab: ShowcaseTab): void {
    this.tabRequestSubject.next(tab);
  }

  dispatchNewsAction(type: NewsActionType, target: string | null = null): void {
    if (type === 'NONE') {
      return;
    }

    this.newsActionSubject.next({ type, target });
  }
}
