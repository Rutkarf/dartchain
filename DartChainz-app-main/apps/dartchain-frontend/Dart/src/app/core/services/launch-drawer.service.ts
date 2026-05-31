import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';

import { CreateLaunchProjectRequest } from '../models/showcase.model';

@Injectable({
  providedIn: 'root',
})
export class LaunchDrawerService {
  private readonly createSubject = new Subject<CreateLaunchProjectRequest>();

  readonly isOpen = signal(false);
  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly onCreate$ = this.createSubject.asObservable();

  open(): void {
    this.errorMessage.set(null);
    this.isOpen.set(true);
  }

  close(): void {
    if (this.submitting()) {
      return;
    }
    this.isOpen.set(false);
    this.errorMessage.set(null);
  }

  emitCreate(request: CreateLaunchProjectRequest): void {
    this.createSubject.next(request);
  }

  setSubmitting(value: boolean): void {
    this.submitting.set(value);
  }

  setError(message: string | null): void {
    this.errorMessage.set(message);
  }
}
