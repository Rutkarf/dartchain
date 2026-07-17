import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ShowcaseHubUiService {
  private readonly expandRequestedSubject = new Subject<void>();

  readonly expandRequested$ = this.expandRequestedSubject.asObservable();

  requestExpand(): void {
    this.expandRequestedSubject.next();
  }
}
