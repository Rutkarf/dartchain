import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export type BottomDockTab = 'wallet' | 'faucet' | 'market' | 'quests' | 'peers';

export type QuestNavigateAction = 'faucet' | 'swap' | 'showcase-tours' | 'market' | 'peers';

@Injectable({ providedIn: 'root' })
export class DockNavigationService {
  private readonly tabRequestSubject = new Subject<BottomDockTab>();
  private readonly questActionSubject = new Subject<QuestNavigateAction>();

  readonly tabRequest$ = this.tabRequestSubject.asObservable();
  readonly questAction$ = this.questActionSubject.asObservable();

  requestTab(tab: BottomDockTab): void {
    this.tabRequestSubject.next(tab);
  }

  requestQuestAction(action: QuestNavigateAction): void {
    this.questActionSubject.next(action);
  }
}
