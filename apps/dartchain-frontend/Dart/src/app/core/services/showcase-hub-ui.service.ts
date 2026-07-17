import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ShowcaseHubUiService {
  private readonly expandRequestedSubject = new Subject<void>();
  private readonly r4v3SwapFocusSubject = new Subject<void>();

  readonly expandRequested$ = this.expandRequestedSubject.asObservable();
  readonly r4v3SwapFocusRequested$ = this.r4v3SwapFocusSubject.asObservable();

  requestExpand(): void {
    this.expandRequestedSubject.next();
  }

  requestExpandR4v3Swap(): void {
    this.expandRequestedSubject.next();
    this.r4v3SwapFocusSubject.next();
  }
}
